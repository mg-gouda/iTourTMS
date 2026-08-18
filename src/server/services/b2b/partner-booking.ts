import { Prisma, type BookingStatus, type PrismaClient } from "@prisma/client";

import { auditPartner } from "@/lib/b2b/audit";
import { db } from "@/server/db";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";
import { notifyRole } from "@/server/services/shared/notifications";
import { invalidatePartnerSearch } from "@/server/services/b2b/partner-search";
import { ON_REQUEST_HOURS } from "@/lib/b2b/limits";

/**
 * Turning a partner's search result into a booking.
 *
 * Three things can stop a straight confirmation, and they are deliberately
 * different states rather than one vague "pending":
 *
 *  - a stop sale        → refused outright; a partner cannot override one
 *  - no allotment left  → ON_REQUEST, with a deadline for staff to answer
 *  - over credit or cap → PENDING_APPROVAL, which is the staff approval queue
 *
 * Allotment is taken with a single conditional UPDATE. Read-then-write is what
 * oversells the last room when two agents book at the same moment: both read
 * "1 left", both write "sold + 1". Here the database decides, once.
 */

export { ON_REQUEST_HOURS } from "@/lib/b2b/limits";

export interface PartnerBookingRoomInput {
  roomTypeId: string;
  mealBasisId: string;
  adults: number;
  children: number;
  infants: number;
  buyingTotal: number;
  guestNames?: { firstName: string; lastName: string; isLead?: boolean }[];
  specialRequests?: string;
}

export interface PartnerBookingInput {
  companyId: string;
  tourOperatorId: string;
  partnerUserId: string;
  bookingValueCap: Prisma.Decimal | null;
  contractId: string;
  hotelId: string;
  checkIn: Date;
  checkOut: Date;
  currencyId: string;
  rooms: PartnerBookingRoomInput[];
  leadGuestFirstName: string;
  leadGuestLastName: string;
  leadGuestEmail?: string;
  leadGuestPhone?: string;
  partnerReference?: string;
  markupPppn: number;
  arrival?: { flightNo?: string; time?: string; originApt?: string; destApt?: string };
  departure?: { flightNo?: string; time?: string; originApt?: string; destApt?: string };
  specialRequests?: string;
  ip?: string | null;
}

export interface PartnerBookingResult {
  id: string;
  code: string;
  status: BookingStatus;
  /** Why it did not confirm outright, in words the partner can act on. */
  reason: string | null;
  onRequestDeadline: Date | null;
  buyingTotal: number;
  clientPrice: number;
}

/** A stop sale anywhere in the stay blocks the whole booking. */
export async function stopSaleBlocks(
  tx: Prisma.TransactionClient,
  contractId: string,
  roomTypeIds: string[],
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> {
  const hit = await tx.contractStopSale.findFirst({
    where: {
      contractId,
      dateFrom: { lt: checkOut },
      dateTo: { gt: checkIn },
      OR: [{ roomTypeId: null }, { roomTypeId: { in: roomTypeIds } }],
    },
    select: { id: true },
  });
  return !!hit;
}

/**
 * Takes `count` rooms of one type for the seasons the stay actually spans,
 * atomically, and reports back exactly which rows it moved so a later failure
 * can be undone precisely.
 *
 * The condition lives in the UPDATE rather than in a read beforehand. Two
 * agents booking the last room at the same moment both read "1 left"; only one
 * of them can satisfy `totalRooms - soldRooms >= count` at write time.
 */
export async function takeAllotment(
  tx: Prisma.TransactionClient,
  contractId: string,
  roomTypeId: string,
  count: number,
  checkIn: Date,
  checkOut: Date,
): Promise<{ ok: boolean; rowIds: string[] }> {
  const applicable = await tx.contractAllotment.findMany({
    where: {
      contractId,
      roomTypeId,
      OR: [
        { seasonId: null },
        { season: { dateFrom: { lt: checkOut }, dateTo: { gt: checkIn } } },
      ],
    },
    select: { id: true, basis: true },
  });

  // No record at all is freesale by convention, as the staff engine treats it.
  if (applicable.length === 0) return { ok: true, rowIds: [] };
  if (applicable.some((a) => a.basis === "ON_REQUEST")) return { ok: false, rowIds: [] };

  const hardIds = applicable
    .filter((a) => a.basis === "COMMITMENT" || a.basis === "ALLOCATION")
    .map((a) => a.id);
  if (hardIds.length === 0) return { ok: true, rowIds: [] };

  const updated = await tx.$queryRaw<{ id: string }[]>`
    UPDATE ct_contract_allotment
       SET "soldRooms" = "soldRooms" + ${count},
           "updatedAt"  = NOW()
     WHERE id = ANY(${hardIds}::text[])
       AND "totalRooms" - "soldRooms" >= ${count}
    RETURNING id
  `;

  // Every season the stay touches has to have room, or the stay is not covered.
  return { ok: updated.length === hardIds.length, rowIds: updated.map((r) => r.id) };
}

/** Gives back rooms taken before a later room type turned out to be full. */
export async function releaseAllotment(
  tx: Prisma.TransactionClient,
  rowIds: string[],
  count: number,
): Promise<void> {
  if (rowIds.length === 0) return;
  await tx.$executeRaw`
    UPDATE ct_contract_allotment
       SET "soldRooms" = GREATEST("soldRooms" - ${count}, 0), "updatedAt" = NOW()
     WHERE id = ANY(${rowIds}::text[])
  `;
}

export async function createPartnerBooking(
  input: PartnerBookingInput,
): Promise<PartnerBookingResult> {
  const nights = Math.round(
    (input.checkOut.getTime() - input.checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );
  const buyingTotal = input.rooms.reduce((sum, r) => sum + r.buyingTotal, 0);
  const occupants = input.rooms.reduce((n, r) => n + r.adults + r.children + r.infants, 0);
  const partnerMarkup = Math.round(input.markupPppn * occupants * nights * 100) / 100;
  const clientPrice = Math.round((buyingTotal + partnerMarkup) * 100) / 100;

  const roomCounts = new Map<string, number>();
  for (const room of input.rooms) {
    roomCounts.set(room.roomTypeId, (roomCounts.get(room.roomTypeId) ?? 0) + 1);
  }

  const result = await db.$transaction(async (tx) => {
    // The partner is re-read inside the transaction: credit moves, and a
    // decision taken on a figure read seconds ago is a decision on stale data.
    const partner = await tx.tourOperator.findUniqueOrThrow({
      where: { id: input.tourOperatorId },
      select: { creditLimit: true, creditUsed: true, name: true },
    });

    if (
      await stopSaleBlocks(
        tx,
        input.contractId,
        [...roomCounts.keys()],
        input.checkIn,
        input.checkOut,
      )
    ) {
      throw new Error("STOP_SALE");
    }

    let status: BookingStatus = "CONFIRMED";
    let reason: string | null = null;
    const taken: { rowIds: string[]; count: number }[] = [];

    for (const [roomTypeId, count] of roomCounts) {
      const result = await takeAllotment(
        tx,
        input.contractId,
        roomTypeId,
        count,
        input.checkIn,
        input.checkOut,
      );
      if (result.ok) {
        taken.push({ rowIds: result.rowIds, count });
        continue;
      }
      // A partial take is still a take, so give back what this attempt moved.
      await releaseAllotment(tx, result.rowIds, count);
      status = "ON_REQUEST";
      reason = "The hotel has no rooms left on allotment — we have asked them to confirm.";
      break;
    }

    // Nothing is held for an on-request booking, so give back whatever the
    // earlier room types already took.
    if (status === "ON_REQUEST") {
      for (const t of taken) await releaseAllotment(tx, t.rowIds, t.count);
    }

    // The cap and the credit limit are staff decisions, so they outrank an
    // on-request: a booking the partner cannot afford does not go to the hotel.
    // A zero limit means "no limit set", not "cannot spend a penny" — the
    // column is non-nullable and defaults to 0.
    const limitValue = Number(partner.creditLimit ?? 0);
    const creditLimit = limitValue > 0 ? limitValue : null;
    const creditUsed = Number(partner.creditUsed ?? 0);
    const capValue = Number(input.bookingValueCap ?? 0);
    const cap = capValue > 0 ? capValue : null;

    let overCredit = false;
    if (creditLimit !== null && creditUsed + buyingTotal > creditLimit) {
      status = "PENDING_APPROVAL";
      overCredit = true;
      reason = `This booking is over your credit limit. It has gone to ${partner.name}'s account manager to approve.`;
    } else if (cap !== null && buyingTotal > cap) {
      status = "PENDING_APPROVAL";
      reason = "This booking is above the value your account is set to confirm on its own, so a colleague of ours will approve it.";
    }

    const code = await generateSequenceNumber(tx as unknown as PrismaClient, input.companyId, "booking");

    const booking = await tx.booking.create({
      data: {
        companyId: input.companyId,
        code,
        status,
        source: "TOUR_OPERATOR",
        hotelId: input.hotelId,
        contractId: input.contractId,
        tourOperatorId: input.tourOperatorId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights,
        currencyId: input.currencyId,
        buyingTotal,
        sellingTotal: buyingTotal,
        leadGuestFirstName: input.leadGuestFirstName,
        leadGuestLastName: input.leadGuestLastName,
        leadGuestName: `${input.leadGuestFirstName} ${input.leadGuestLastName}`.trim(),
        leadGuestEmail: input.leadGuestEmail ?? null,
        leadGuestPhone: input.leadGuestPhone ?? null,
        partnerReference: input.partnerReference ?? null,
        partnerMarkupPppn: input.markupPppn,
        partnerClientPrice: clientPrice,
        onRequestDeadline:
          status === "ON_REQUEST"
            ? new Date(Date.now() + ON_REQUEST_HOURS * 3_600_000)
            : null,
        noOfRooms: input.rooms.length,
        adults: input.rooms.reduce((n, r) => n + r.adults, 0),
        children: input.rooms.reduce((n, r) => n + r.children, 0),
        infants: input.rooms.reduce((n, r) => n + r.infants, 0),
        arrivalFlightNo: input.arrival?.flightNo ?? null,
        arrivalTime: input.arrival?.time ?? null,
        arrivalOriginApt: input.arrival?.originApt ?? null,
        arrivalDestApt: input.arrival?.destApt ?? null,
        departFlightNo: input.departure?.flightNo ?? null,
        departTime: input.departure?.time ?? null,
        departOriginApt: input.departure?.originApt ?? null,
        departDestApt: input.departure?.destApt ?? null,
        specialRequests: input.specialRequests ?? null,
        bookingDate: new Date(),
        createdById: input.partnerUserId,
        guestNames: input.rooms.flatMap((r) => r.guestNames ?? []) as object,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
        rooms: {
          create: input.rooms.map((room, i) => ({
            roomTypeId: room.roomTypeId,
            mealBasisId: room.mealBasisId,
            roomIndex: i + 1,
            adults: room.adults,
            children: room.children,
            infants: room.infants,
            buyingTotal: room.buyingTotal,
            buyingRatePerNight: Math.round((room.buyingTotal / nights) * 100) / 100,
            sellingTotal: room.buyingTotal,
            sellingRatePerNight: Math.round((room.buyingTotal / nights) * 100) / 100,
            specialRequests: room.specialRequests ?? null,
          })),
        },
      },
      select: { id: true, code: true, status: true, onRequestDeadline: true },
    });

    // Goes into the same queue staff already work: an over-limit booking is a
    // credit decision, not a booking decision, and it belongs where the other
    // credit decisions are.
    if (overCredit && creditLimit !== null) {
      await tx.creditOverrideRequest.create({
        data: {
          companyId: input.companyId,
          tourOperatorId: input.tourOperatorId,
          requestedById: input.partnerUserId,
          amount: buyingTotal,
          currentUsed: creditUsed,
          creditLimit,
          overageAmount: creditUsed + buyingTotal - creditLimit,
          pendingType: "b2b_booking",
          pendingPayload: { bookingId: booking.id, code: booking.code },
        },
      });
    }

    // Credit is consumed by a booking that is going ahead. An on-request or a
    // rejected approval must not eat the partner's limit while it waits.
    if (status === "CONFIRMED") {
      const running = creditUsed + buyingTotal;
      await tx.tourOperator.update({
        where: { id: input.tourOperatorId },
        data: { creditUsed: running },
      });
      await tx.b2bCreditTransaction.create({
        data: {
          companyId: input.companyId,
          tourOperatorId: input.tourOperatorId,
          type: "BOOKING_CHARGE",
          amount: buyingTotal,
          runningBalance: running,
          bookingId: booking.id,
          reference: booking.code,
          createdById: input.partnerUserId,
        },
      });
    }

    return { booking, status, reason };
  });

  const { booking, status, reason } = result;

  // Anything the partner cannot resolve themselves needs a human on our side.
  if (status !== "CONFIRMED") {
    await notifyRole(db, input.companyId, "super_admin", {
      type: status === "ON_REQUEST" ? "B2B_ON_REQUEST" : "B2B_APPROVAL_REQUIRED",
      title: status === "ON_REQUEST" ? "Partner booking on request" : "Partner booking needs approval",
      message: `${booking.code} from a partner needs an answer. ${reason ?? ""}`.trim(),
      link: `/reservations/bookings/${booking.id}`,
      bookingId: booking.id,
    });
  }

  await Promise.all([
    invalidatePartnerSearch(input.tourOperatorId),
    auditPartner("BOOKING_CREATED", {
      companyId: input.companyId,
      tourOperatorId: input.tourOperatorId,
      userId: input.partnerUserId,
      entityType: "Booking",
      entityId: booking.id,
      ip: input.ip,
      metadata: { code: booking.code, status, buyingTotal },
    }),
  ]);

  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    reason,
    onRequestDeadline: booking.onRequestDeadline,
    buyingTotal,
    clientPrice,
  };
}
