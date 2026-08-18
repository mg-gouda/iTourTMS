import type { BookingStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

import { auditPartner } from "@/lib/b2b/audit";
import { db } from "@/server/db";
import { calculateCancellationPenalty } from "@/server/services/reservations/cancellation-engine";
import { notifyRole } from "@/server/services/shared/notifications";
import {
  invalidatePartnerSearch,
  quotePartnerRooms,
  type RoomQuoteRequest,
} from "@/server/services/b2b/partner-search";
import { releaseAllotment, stopSaleBlocks, takeAllotment } from "@/server/services/b2b/partner-booking";

/**
 * Changing a booking a partner already holds.
 *
 * Three rules decide what a partner may do on their own, and all three come
 * from the agreed plan rather than from convenience:
 *
 *  - a re-price that comes out **higher** is the partner's to absorb, but they
 *    see the new figure and confirm it before it lands;
 *  - a change that **reduces** the value inside the cancellation penalty window
 *    is a refund question, so it goes to staff;
 *  - if the new dates or rooms have **no allotment**, the amendment goes on
 *    request and the original booking is left exactly as it was.
 *
 * The price is always re-read from the contract. What the browser thinks the
 * change costs is only used to detect that the quote moved underneath it.
 */

/** How far a quoted amendment price may drift before we make them look again. */
const QUOTE_TOLERANCE = 0.01;

export interface AmendmentRoomInput extends RoomQuoteRequest {
  guestNames?: { firstName: string; lastName: string; isLead?: boolean }[];
  specialRequests?: string;
}

export interface AmendmentRequest {
  companyId: string;
  tourOperatorId: string;
  partnerUserId: string;
  bookingId: string;
  checkIn: Date;
  checkOut: Date;
  rooms: AmendmentRoomInput[];
  ip?: string | null;
}

export interface AmendmentQuote {
  bookingCode: string;
  nights: number;
  currencyCode: string;
  /** What the booking costs today, net of any partner markup. */
  currentTotal: number;
  /** What it would cost after the change. */
  newTotal: number;
  /** Positive means the partner pays more. */
  difference: number;
  /** The client price the partner's own markup produces on the new figure. */
  newClientPrice: number;
  /** `self_service` applies straight away; the others need somebody else. */
  outcome: "self_service" | "needs_approval" | "on_request" | "blocked";
  reason: string | null;
  penalty: { amount: number; percent: number; daysBefore: number } | null;
}

class AmendmentBlocked extends Error {
  constructor(readonly outcome: AmendmentQuote["outcome"], message: string) {
    super(message);
  }
}

/** The booking, if it belongs to this partner and can still be changed. */
async function loadAmendableBooking(req: {
  companyId: string;
  tourOperatorId: string;
  bookingId: string;
}) {
  const booking = await db.booking.findFirst({
    where: {
      id: req.bookingId,
      companyId: req.companyId,
      tourOperatorId: req.tourOperatorId,
    },
    select: {
      id: true,
      code: true,
      status: true,
      contractId: true,
      hotelId: true,
      checkIn: true,
      checkOut: true,
      nights: true,
      buyingTotal: true,
      partnerMarkupPppn: true,
      currency: { select: { code: true } },
      rooms: { select: { id: true, roomTypeId: true, adults: true, children: true, infants: true } },
    },
  });

  if (!booking) throw new AmendmentBlocked("blocked", "That booking is not on your account.");
  if (!booking.contractId || !booking.hotelId) {
    throw new AmendmentBlocked("blocked", "This booking cannot be changed online. Contact your account manager.");
  }

  const changeable: BookingStatus[] = ["CONFIRMED", "ON_REQUEST", "PENDING_APPROVAL"];
  if (!changeable.includes(booking.status)) {
    throw new AmendmentBlocked("blocked", `A ${booking.status.toLowerCase().replace("_", " ")} booking cannot be changed.`);
  }
  if (booking.checkIn <= new Date()) {
    throw new AmendmentBlocked("blocked", "The stay has started. Contact your account manager.");
  }

  return booking;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Prices a proposed change and says who has to agree to it. Reserves nothing
 * and writes nothing — the partner sees the number before anything moves.
 */
export async function quotePartnerAmendment(req: AmendmentRequest): Promise<AmendmentQuote> {
  const booking = await loadAmendableBooking(req);
  const nights = Math.round((req.checkOut.getTime() - req.checkIn.getTime()) / 86_400_000);
  const currentTotal = Number(booking.buyingTotal);

  const base: Omit<AmendmentQuote, "outcome" | "reason" | "newTotal" | "difference" | "newClientPrice"> = {
    bookingCode: booking.code,
    nights,
    currencyCode: booking.currency?.code ?? "",
    currentTotal,
    penalty: null,
  };

  let quotes;
  try {
    quotes = await quotePartnerRooms({
      companyId: req.companyId,
      tourOperatorId: req.tourOperatorId,
      hotelId: booking.hotelId!,
      checkIn: req.checkIn,
      checkOut: req.checkOut,
      rooms: req.rooms,
    });
  } catch (err) {
    // No rate for the new shape is not a failure the partner can fix by
    // retrying: it goes to staff as a request, and the booking stands.
    const message =
      (err as Error).message === "NOT_AVAILABLE"
        ? "The hotel has nothing left at those dates, so we have asked them. Your existing booking is unchanged."
        : "That hotel is not available on your account.";
    return {
      ...base,
      newTotal: currentTotal,
      difference: 0,
      newClientPrice: 0,
      outcome: (err as Error).message === "NOT_AVAILABLE" ? "on_request" : "blocked",
      reason: message,
    };
  }

  const newTotal = round(quotes.reduce((sum, q) => sum + q.net, 0));
  const difference = round(newTotal - currentTotal);
  const occupants = req.rooms.reduce((n, r) => n + r.adults + r.children + r.infants, 0);
  const markupPppn = Number(booking.partnerMarkupPppn ?? 0);
  const newClientPrice = round(newTotal + markupPppn * occupants * nights);

  // A stop sale is absolute — it is the hotel refusing, not a price question.
  const blocked = await stopSaleBlocks(
    db as unknown as Prisma.TransactionClient,
    booking.contractId!,
    [...new Set(req.rooms.map((r) => r.roomTypeId))],
    req.checkIn,
    req.checkOut,
  );
  if (blocked) {
    return {
      ...base,
      newTotal,
      difference,
      newClientPrice,
      outcome: "blocked",
      reason: "The hotel has closed those dates for sale. Please choose different dates.",
    };
  }

  // Value-reducing changes are refunds in disguise, so inside the penalty
  // window they are a staff decision — the same rule a cancellation follows.
  if (difference < 0) {
    const penalty = await calculateCancellationPenalty(booking.id);
    if (penalty.penaltyAmount > 0) {
      return {
        ...base,
        newTotal,
        difference,
        newClientPrice,
        penalty: {
          amount: penalty.penaltyAmount,
          percent: penalty.penaltyPercent,
          daysBefore: penalty.daysBefore,
        },
        outcome: "needs_approval",
        reason: `This change reduces the value inside the cancellation window (${penalty.daysBefore} days before arrival), so we need to approve it. Your existing booking is unchanged until we do.`,
      };
    }
  }

  return {
    ...base,
    newTotal,
    difference,
    newClientPrice,
    outcome: "self_service",
    reason:
      difference > 0
        ? `This change costs ${difference.toFixed(2)} ${base.currencyCode} more. Confirming accepts the new price.`
        : null,
  };
}

/**
 * Applies the change the partner just saw, re-quoting first so a price that
 * moved between the two calls stops the amendment rather than surprising them.
 *
 * Anything that is not self-service is recorded on the booking's timeline and
 * sent to staff; the booking itself is not touched.
 */
export async function applyPartnerAmendment(
  req: AmendmentRequest & { acceptedTotal: number },
): Promise<{ status: "applied" | "requested"; quote: AmendmentQuote }> {
  const quote = await quotePartnerAmendment(req);

  if (quote.outcome === "blocked") {
    throw new AmendmentBlocked("blocked", quote.reason ?? "This change cannot be made.");
  }

  if (quote.outcome !== "self_service") {
    await recordAmendmentRequest(req, quote);
    return { status: "requested", quote };
  }

  // The figure they agreed to has to be the figure we charge; a contract edit
  // or an offer expiring between quote and confirm must not slip through.
  if (Math.abs(quote.newTotal - req.acceptedTotal) > QUOTE_TOLERANCE) {
    throw new AmendmentBlocked(
      "blocked",
      `The price changed while you were confirming — it is now ${quote.newTotal.toFixed(2)} ${quote.currencyCode}. Please review it again.`,
    );
  }

  const booking = await loadAmendableBooking(req);
  const nights = quote.nights;
  const oldTotal = Number(booking.buyingTotal);

  const oldCounts = new Map<string, number>();
  for (const room of booking.rooms) {
    oldCounts.set(room.roomTypeId, (oldCounts.get(room.roomTypeId) ?? 0) + 1);
  }
  const newCounts = new Map<string, number>();
  for (const room of req.rooms) {
    newCounts.set(room.roomTypeId, (newCounts.get(room.roomTypeId) ?? 0) + 1);
  }

  try {
    await db.$transaction(async (tx) => {
      // Give the old rooms back first, then take the new ones. If the take
      // fails we throw, the transaction unwinds, and the release never
      // happened either — the booking is exactly as it was.
      if (booking.status === "CONFIRMED") {
        for (const [roomTypeId, count] of oldCounts) {
          const rows = await tx.contractAllotment.findMany({
            where: {
              contractId: booking.contractId!,
              roomTypeId,
              OR: [
                { seasonId: null },
                { season: { dateFrom: { lt: booking.checkOut }, dateTo: { gt: booking.checkIn } } },
              ],
              basis: { in: ["COMMITMENT", "ALLOCATION"] },
            },
            select: { id: true },
          });
          await releaseAllotment(tx, rows.map((r) => r.id), count);
        }
      }

      for (const [roomTypeId, count] of newCounts) {
        const taken = await takeAllotment(
          tx,
          booking.contractId!,
          roomTypeId,
          count,
          req.checkIn,
          req.checkOut,
        );
        if (!taken.ok) {
          await releaseAllotment(tx, taken.rowIds, count);
          throw new AmendmentBlocked("on_request", "NO_ALLOTMENT");
        }
      }

      const occupants = req.rooms.reduce((n, r) => n + r.adults + r.children + r.infants, 0);

      await tx.bookingRoom.deleteMany({ where: { bookingId: booking.id } });
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          checkIn: req.checkIn,
          checkOut: req.checkOut,
          nights,
          buyingTotal: quote.newTotal,
          sellingTotal: quote.newTotal,
          partnerClientPrice: quote.newClientPrice,
          noOfRooms: req.rooms.length,
          adults: req.rooms.reduce((n, r) => n + r.adults, 0),
          children: req.rooms.reduce((n, r) => n + r.children, 0),
          infants: req.rooms.reduce((n, r) => n + r.infants, 0),
          guestNames: req.rooms.flatMap((r) => r.guestNames ?? []) as object,
          rooms: {
            create: req.rooms.map((room, i) => ({
              roomTypeId: room.roomTypeId,
              mealBasisId: room.mealBasisId,
              roomIndex: i + 1,
              adults: room.adults,
              children: room.children,
              infants: room.infants,
              buyingTotal: quote.newTotal / req.rooms.length,
              buyingRatePerNight: round(quote.newTotal / req.rooms.length / nights),
              sellingTotal: quote.newTotal / req.rooms.length,
              sellingRatePerNight: round(quote.newTotal / req.rooms.length / nights),
              specialRequests: room.specialRequests ?? null,
            })),
          },
        },
      });

      // Both prices on the record, which is what makes an absorbed increase
      // arguable later instead of a mystery.
      await tx.bookingRateChange.create({
        data: {
          bookingId: booking.id,
          changedById: req.partnerUserId,
          source: "RECALCULATED",
          appliedOffers: [],
          reason: `Partner amendment — ${occupants} occupants, ${nights} nights`,
          oldBuyingTotal: oldTotal,
          newBuyingTotal: quote.newTotal,
        },
      });

      await tx.bookingTimeline.create({
        data: {
          bookingId: booking.id,
          action: "PARTNER_AMENDED",
          details: `Dates ${req.checkIn.toISOString().slice(0, 10)} → ${req.checkOut
            .toISOString()
            .slice(0, 10)}, ${req.rooms.length} room(s). Price ${oldTotal.toFixed(2)} → ${quote.newTotal.toFixed(2)} ${quote.currencyCode}.`,
          userId: req.partnerUserId,
        },
      });

      // Credit follows the money, but only for a booking that is consuming it.
      const delta = new Decimal(quote.newTotal).minus(oldTotal);
      if (booking.status === "CONFIRMED" && !delta.isZero()) {
        const partner = await tx.tourOperator.findUniqueOrThrow({
          where: { id: req.tourOperatorId },
          select: { creditUsed: true },
        });
        const running = new Decimal(partner.creditUsed ?? 0).plus(delta);
        await tx.tourOperator.update({
          where: { id: req.tourOperatorId },
          data: { creditUsed: running.toNumber() },
        });
        await tx.b2bCreditTransaction.create({
          data: {
            companyId: req.companyId,
            tourOperatorId: req.tourOperatorId,
            type: delta.isPositive() ? "BOOKING_CHARGE" : "CREDIT_NOTE",
            amount: delta.abs().toNumber(),
            runningBalance: running.toNumber(),
            bookingId: booking.id,
            reference: `${booking.code} amendment`,
            createdById: req.partnerUserId,
          },
        });
      }
    });
  } catch (err) {
    // The one failure that is not an error: the new shape has no allotment.
    if (err instanceof AmendmentBlocked && err.message === "NO_ALLOTMENT") {
      const onRequest: AmendmentQuote = {
        ...quote,
        outcome: "on_request",
        reason:
          "The hotel has no rooms left for the new dates, so we have asked them. Your existing booking is unchanged.",
      };
      await recordAmendmentRequest(req, onRequest);
      return { status: "requested", quote: onRequest };
    }
    throw err;
  }

  await Promise.all([
    invalidatePartnerSearch(req.tourOperatorId),
    auditPartner("BOOKING_AMENDED", {
      companyId: req.companyId,
      tourOperatorId: req.tourOperatorId,
      userId: req.partnerUserId,
      entityType: "Booking",
      entityId: booking.id,
      ip: req.ip,
      metadata: { code: booking.code, oldTotal, newTotal: quote.newTotal },
    }),
  ]);

  return { status: "applied", quote };
}

/**
 * What we do instead of amending when the answer is not ours to give: write
 * the request where staff already look, and tell them.
 *
 * ponytail: no approval queue of its own — staff resolve it on the booking
 * screen they already use, and the timeline entry is the record.
 */
async function recordAmendmentRequest(req: AmendmentRequest, quote: AmendmentQuote): Promise<void> {
  const detail = [
    `Requested: ${req.checkIn.toISOString().slice(0, 10)} → ${req.checkOut.toISOString().slice(0, 10)}`,
    `${req.rooms.length} room(s), ${req.rooms.reduce((n, r) => n + r.adults + r.children + r.infants, 0)} occupants`,
    `Price ${quote.currentTotal.toFixed(2)} → ${quote.newTotal.toFixed(2)} ${quote.currencyCode}`,
    quote.reason ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  await db.bookingTimeline.create({
    data: {
      bookingId: req.bookingId,
      action: quote.outcome === "on_request" ? "PARTNER_AMENDMENT_ON_REQUEST" : "PARTNER_AMENDMENT_REQUESTED",
      details: detail,
      userId: req.partnerUserId,
    },
  });

  await notifyRole(db, req.companyId, "super_admin", {
    type: "B2B_AMENDMENT_REQUESTED",
    title: `Partner amendment on ${quote.bookingCode}`,
    message: detail,
    link: `/reservations/bookings/${req.bookingId}`,
    bookingId: req.bookingId,
  });

  await auditPartner("BOOKING_AMENDED", {
    companyId: req.companyId,
    tourOperatorId: req.tourOperatorId,
    userId: req.partnerUserId,
    entityType: "Booking",
    entityId: req.bookingId,
    ip: req.ip,
    metadata: { requested: true, outcome: quote.outcome, newTotal: quote.newTotal },
  });
}

export { AmendmentBlocked };

export interface CancellationPreview {
  bookingCode: string;
  currencyCode: string;
  bookingTotal: number;
  penaltyAmount: number;
  penaltyPercent: number;
  daysBefore: number;
  policy: string | null;
  /** Inside the penalty window a cancellation is a refund decision, not ours. */
  needsApproval: boolean;
}

/** What cancelling would cost, without cancelling anything. */
export async function previewPartnerCancellation(req: {
  companyId: string;
  tourOperatorId: string;
  bookingId: string;
}): Promise<CancellationPreview> {
  const booking = await loadAmendableBooking(req);
  const penalty = await calculateCancellationPenalty(booking.id);

  return {
    bookingCode: booking.code,
    currencyCode: booking.currency?.code ?? "",
    bookingTotal: Number(booking.buyingTotal),
    penaltyAmount: penalty.penaltyAmount,
    penaltyPercent: penalty.penaltyPercent,
    daysBefore: penalty.daysBefore,
    policy: penalty.description,
    needsApproval: penalty.penaltyAmount > 0,
  };
}

/**
 * Cancels outright when it is free to do so; inside the penalty window the
 * request goes to staff instead, because a penalty is money changing hands and
 * that is not a decision the portal makes on its own.
 */
export async function cancelPartnerBooking(req: {
  companyId: string;
  tourOperatorId: string;
  partnerUserId: string;
  bookingId: string;
  reason?: string;
  ip?: string | null;
}): Promise<{ status: "cancelled" | "requested"; preview: CancellationPreview }> {
  const preview = await previewPartnerCancellation(req);
  const booking = await loadAmendableBooking(req);

  if (preview.needsApproval) {
    const detail = `Cancellation requested. Penalty ${preview.penaltyAmount.toFixed(2)} ${preview.currencyCode} (${preview.daysBefore} days before arrival).${req.reason ? ` Reason: ${req.reason}` : ""}`;

    await db.bookingTimeline.create({
      data: {
        bookingId: booking.id,
        action: "PARTNER_CANCELLATION_REQUESTED",
        details: detail,
        userId: req.partnerUserId,
      },
    });

    // Reservations act on it; accounting need to know a penalty is coming.
    await Promise.all([
      notifyRole(db, req.companyId, "super_admin", {
        type: "B2B_CANCELLATION_REQUESTED",
        title: `Partner cancellation on ${booking.code}`,
        message: detail,
        link: `/reservations/bookings/${booking.id}`,
        bookingId: booking.id,
      }),
      notifyRole(db, req.companyId, "accountant", {
        type: "B2B_CANCELLATION_PENALTY",
        title: `Cancellation penalty pending on ${booking.code}`,
        message: detail,
        link: `/reservations/bookings/${booking.id}`,
        bookingId: booking.id,
      }),
      auditPartner("BOOKING_CANCELLED", {
        companyId: req.companyId,
        tourOperatorId: req.tourOperatorId,
        userId: req.partnerUserId,
        entityType: "Booking",
        entityId: booking.id,
        ip: req.ip,
        metadata: { requested: true, penalty: preview.penaltyAmount },
      }),
    ]);

    return { status: "requested", preview };
  }

  const total = Number(booking.buyingTotal);

  await db.$transaction(async (tx) => {
    if (booking.status === "CONFIRMED") {
      const counts = new Map<string, number>();
      for (const room of booking.rooms) {
        counts.set(room.roomTypeId, (counts.get(room.roomTypeId) ?? 0) + 1);
      }
      for (const [roomTypeId, count] of counts) {
        const rows = await tx.contractAllotment.findMany({
          where: {
            contractId: booking.contractId!,
            roomTypeId,
            OR: [
              { seasonId: null },
              { season: { dateFrom: { lt: booking.checkOut }, dateTo: { gt: booking.checkIn } } },
            ],
            basis: { in: ["COMMITMENT", "ALLOCATION"] },
          },
          select: { id: true },
        });
        await releaseAllotment(tx, rows.map((r) => r.id), count);
      }

      // The credit the booking was holding goes back, in full: there is no
      // penalty on this path, that is what made it self-service.
      const partner = await tx.tourOperator.findUniqueOrThrow({
        where: { id: req.tourOperatorId },
        select: { creditUsed: true },
      });
      const running = new Decimal(partner.creditUsed ?? 0).minus(total);
      await tx.tourOperator.update({
        where: { id: req.tourOperatorId },
        data: { creditUsed: Decimal.max(running, 0).toNumber() },
      });
      await tx.b2bCreditTransaction.create({
        data: {
          companyId: req.companyId,
          tourOperatorId: req.tourOperatorId,
          type: "CREDIT_NOTE",
          amount: total,
          runningBalance: Decimal.max(running, 0).toNumber(),
          bookingId: booking.id,
          reference: `${booking.code} cancelled`,
          createdById: req.partnerUserId,
        },
      });
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: req.partnerUserId,
        cancellationReason: req.reason ?? "Cancelled by partner",
      },
    });

    await tx.bookingTimeline.create({
      data: {
        bookingId: booking.id,
        action: "PARTNER_CANCELLED",
        details: `Cancelled by partner with no penalty (${preview.daysBefore} days before arrival).`,
        userId: req.partnerUserId,
      },
    });
  });

  await Promise.all([
    invalidatePartnerSearch(req.tourOperatorId),
    notifyRole(db, req.companyId, "super_admin", {
      type: "B2B_BOOKING_CANCELLED",
      title: `Partner cancelled ${booking.code}`,
      message: `${booking.code} was cancelled by the partner with no penalty.`,
      link: `/reservations/bookings/${booking.id}`,
      bookingId: booking.id,
    }),
    auditPartner("BOOKING_CANCELLED", {
      companyId: req.companyId,
      tourOperatorId: req.tourOperatorId,
      userId: req.partnerUserId,
      entityType: "Booking",
      entityId: booking.id,
      ip: req.ip,
      metadata: { code: booking.code, total },
    }),
  ]);

  return { status: "cancelled", preview };
}
