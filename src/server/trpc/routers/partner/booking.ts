import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";

import { createTRPCRouter, partnerProcedure, partnerRoleProcedure } from "@/server/trpc";
import {
  AmendmentBlocked,
  applyPartnerAmendment,
  cancelPartnerBooking,
  previewPartnerCancellation,
  quotePartnerAmendment,
} from "@/server/services/b2b/partner-amendment";
import { createPartnerBooking } from "@/server/services/b2b/partner-booking";
import { loadPartnerMarkupRules, pickMarkupRule } from "@/server/services/b2b/partner-markup";
import { quotePartnerRooms } from "@/server/services/b2b/partner-search";

/** Accountants see the money but do not sell. Admins and agents book. */
const bookingProcedure = partnerRoleProcedure("PARTNER_ADMIN", "PARTNER_AGENT");

const guestName = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  isLead: z.boolean().optional(),
});

const flight = z
  .object({
    flightNo: z.string().max(20).optional(),
    time: z.string().max(10).optional(),
    originApt: z.string().max(10).optional(),
    destApt: z.string().max(10).optional(),
  })
  .optional();

const roomInput = z.object({
  roomTypeId: z.string().min(1),
  mealBasisId: z.string().min(1),
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(10),
  infants: z.number().int().min(0).max(10),
  childAges: z.array(z.number().int().min(0).max(17)).max(10).default([]),
  guestNames: z.array(guestName).max(20).optional(),
  specialRequests: z.string().max(500).optional(),
});

const amendmentInput = z.object({
  id: z.string(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  rooms: z.array(roomInput).min(1).max(20),
});

/**
 * The service says why a change cannot be made in words meant for a partner;
 * this only decides which HTTP-ish code carries them.
 */
function amendmentError(err: unknown): TRPCError {
  if (err instanceof AmendmentBlocked) {
    return new TRPCError({ code: "CONFLICT", message: err.message });
  }
  if (err instanceof TRPCError) return err;
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "That change could not be made." });
}

export const partnerBookingRouter = createTRPCRouter({
  /**
   * Books one stay, of one or more rooms. The price is never taken from the
   * client: the rooms are re-priced here from the contract, so a tampered
   * payload buys nothing at the wrong rate.
   */
  create: bookingProcedure
    .input(
      z.object({
        contractId: z.string().min(1),
        hotelId: z.string().min(1),
        checkIn: z.string().min(1),
        checkOut: z.string().min(1),
        rooms: z.array(roomInput).min(1).max(20),
        leadGuestFirstName: z.string().min(1).max(60),
        leadGuestLastName: z.string().min(1).max(60),
        leadGuestEmail: z.string().email().optional(),
        leadGuestPhone: z.string().max(30).optional(),
        partnerReference: z.string().max(60).optional(),
        arrival: flight,
        departure: flight,
        specialRequests: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // The contract must belong to us and the hotel must be on this partner's
      // allowlist — otherwise the booking is for a deal they cannot see.
      const contract = await ctx.db.contract.findFirst({
        where: {
          id: input.contractId,
          companyId: ctx.partner.companyId,
          hotelId: input.hotelId,
          status: "PUBLISHED",
          hotel: { tourOperators: { some: { tourOperatorId: ctx.partner.tourOperatorId } } },
        },
        select: { id: true, baseCurrencyId: true },
      });
      if (!contract) {
        throw new TRPCError({ code: "FORBIDDEN", message: "That hotel is not available on your account." });
      }

      const rules = await loadPartnerMarkupRules(ctx.partner.tourOperatorId, [input.hotelId]);
      const markupPppn = pickMarkupRule(rules.get(input.hotelId), null)?.amountPppn ?? 0;

      const checkIn = new Date(input.checkIn);
      const checkOut = new Date(input.checkOut);

      // Priced here, from the contract — never from the browser.
      const quotes = await quotePartnerRooms({
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        hotelId: input.hotelId,
        checkIn,
        checkOut,
        rooms: input.rooms,
      }).catch((err: Error) => {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            err.message === "NOT_AVAILABLE"
              ? "Those rooms are no longer available at that rate. Search again for current prices."
              : "That hotel is not available on your account.",
        });
      });

      try {
        return await createPartnerBooking({
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          partnerUserId: ctx.partner.userId,
          bookingValueCap: ctx.partner.bookingValueCap,
          contractId: contract.id,
          hotelId: input.hotelId,
          checkIn,
          checkOut,
          currencyId: contract.baseCurrencyId,
          rooms: input.rooms.map((room, i) => ({ ...room, buyingTotal: quotes[i].net })),
          leadGuestFirstName: input.leadGuestFirstName,
          leadGuestLastName: input.leadGuestLastName,
          leadGuestEmail: input.leadGuestEmail,
          leadGuestPhone: input.leadGuestPhone,
          partnerReference: input.partnerReference,
          markupPppn,
          arrival: input.arrival,
          departure: input.departure,
          specialRequests: input.specialRequests,
          ip: ctx.clientIp,
        });
      } catch (err) {
        if (err instanceof Error && err.message === "STOP_SALE") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "The hotel has closed these dates for sale. Please choose different dates.",
          });
        }
        throw err;
      }
    }),

  /**
   * A series: the same stay repeated on several arrival dates. Each departure
   * is its own booking, so one being on request does not hold up the rest.
   */
  createSeries: bookingProcedure
    .input(
      z.object({
        checkInDates: z.array(z.string().min(1)).min(1).max(26),
        nights: z.number().int().min(1).max(30),
        booking: z.object({
          contractId: z.string().min(1),
          hotelId: z.string().min(1),
          rooms: z.array(roomInput).min(1).max(20),
          leadGuestFirstName: z.string().min(1).max(60),
          leadGuestLastName: z.string().min(1).max(60),
          leadGuestEmail: z.string().email().optional(),
          partnerReference: z.string().max(60).optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirst({
        where: {
          id: input.booking.contractId,
          companyId: ctx.partner.companyId,
          hotelId: input.booking.hotelId,
          status: "PUBLISHED",
          hotel: { tourOperators: { some: { tourOperatorId: ctx.partner.tourOperatorId } } },
        },
        select: { id: true, baseCurrencyId: true },
      });
      if (!contract) {
        throw new TRPCError({ code: "FORBIDDEN", message: "That hotel is not available on your account." });
      }

      const rules = await loadPartnerMarkupRules(ctx.partner.tourOperatorId, [input.booking.hotelId]);
      const markupPppn = pickMarkupRule(rules.get(input.booking.hotelId), null)?.amountPppn ?? 0;

      const results = [];
      for (const date of input.checkInDates) {
        const checkIn = new Date(date);
        const checkOut = new Date(checkIn.getTime() + input.nights * 86_400_000);
        try {
          // Rates move between departures, so every date is priced on its own.
          const quotes = await quotePartnerRooms({
            companyId: ctx.partner.companyId,
            tourOperatorId: ctx.partner.tourOperatorId,
            hotelId: input.booking.hotelId,
            checkIn,
            checkOut,
            rooms: input.booking.rooms,
          });

          results.push(
            await createPartnerBooking({
              companyId: ctx.partner.companyId,
              tourOperatorId: ctx.partner.tourOperatorId,
              partnerUserId: ctx.partner.userId,
              bookingValueCap: ctx.partner.bookingValueCap,
              contractId: contract.id,
              hotelId: input.booking.hotelId,
              checkIn,
              checkOut,
              currencyId: contract.baseCurrencyId,
              rooms: input.booking.rooms.map((room, i) => ({
                ...room,
                buyingTotal: quotes[i].net,
              })),
              leadGuestFirstName: input.booking.leadGuestFirstName,
              leadGuestLastName: input.booking.leadGuestLastName,
              leadGuestEmail: input.booking.leadGuestEmail,
              partnerReference: input.booking.partnerReference,
              markupPppn,
              ip: ctx.clientIp,
            }),
          );
        } catch (err) {
          // One blocked departure must not lose the ones that worked.
          results.push({
            id: "",
            code: "",
            status: "CANCELLED" as const,
            reason:
              err instanceof Error && err.message === "STOP_SALE"
                ? `${date}: the hotel has closed these dates for sale.`
                : err instanceof Error && err.message === "NOT_AVAILABLE"
                  ? `${date}: no rooms available at that rate.`
                  : `${date}: could not be booked.`,
            onRequestDeadline: null,
            buyingTotal: 0,
            clientPrice: 0,
          });
        }
      }

      return results;
    }),

  /** The partner's own bookings — scoped by the session, never by input. */
  list: partnerProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          search: z.string().max(60).optional(),
          take: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.booking.findMany({
        where: {
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          ...(input?.status ? { status: input.status as never } : {}),
          ...(input?.search
            ? {
                OR: [
                  { code: { contains: input.search, mode: "insensitive" } },
                  { partnerReference: { contains: input.search, mode: "insensitive" } },
                  { leadGuestLastName: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          code: true,
          status: true,
          checkIn: true,
          checkOut: true,
          nights: true,
          noOfRooms: true,
          adults: true,
          children: true,
          buyingTotal: true,
          partnerClientPrice: true,
          partnerReference: true,
          onRequestDeadline: true,
          leadGuestFirstName: true,
          leadGuestLastName: true,
          hotel: { select: { id: true, name: true } },
          currency: { select: { code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.take ?? 50,
      });
    }),
  /** One booking, in full — the partner's own, never anyone else's. */
  getById: partnerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirst({
        where: {
          id: input.id,
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
        },
        select: {
          id: true,
          code: true,
          status: true,
          checkIn: true,
          checkOut: true,
          nights: true,
          noOfRooms: true,
          adults: true,
          children: true,
          infants: true,
          buyingTotal: true,
          partnerMarkupPppn: true,
          partnerClientPrice: true,
          partnerReference: true,
          onRequestDeadline: true,
          bookingDate: true,
          leadGuestFirstName: true,
          leadGuestLastName: true,
          leadGuestEmail: true,
          leadGuestPhone: true,
          specialRequests: true,
          guestNames: true,
          arrivalFlightNo: true,
          arrivalTime: true,
          arrivalOriginApt: true,
          arrivalDestApt: true,
          departFlightNo: true,
          departTime: true,
          departOriginApt: true,
          departDestApt: true,
          cancelledAt: true,
          cancellationReason: true,
          contractId: true,
          hotel: { select: { id: true, name: true, code: true, starRating: true, city: true } },
          currency: { select: { code: true } },
          rooms: {
            orderBy: { roomIndex: "asc" },
            select: {
              id: true,
              roomIndex: true,
              adults: true,
              children: true,
              infants: true,
              buyingTotal: true,
              specialRequests: true,
              roomType: { select: { id: true, name: true } },
              mealBasis: { select: { id: true, name: true, mealCode: true } },
            },
          },
          // Only what the partner did or was told; internal staff notes stay internal.
          timeline: {
            where: { action: { startsWith: "PARTNER_" } },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, action: true, details: true, createdAt: true },
          },
          rateChanges: {
            orderBy: { changedAt: "desc" },
            take: 10,
            select: { id: true, changedAt: true, reason: true, oldBuyingTotal: true, newBuyingTotal: true },
          },
        },
      });

      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "That booking is not on your account." });
      return booking;
    }),

  /**
   * The edits that cost nothing and reserve nothing: who is travelling, which
   * flight they are on, what they have asked the hotel for.
   */
  updateDetails: bookingProcedure
    .input(
      z.object({
        id: z.string(),
        leadGuestFirstName: z.string().min(1).max(60).optional(),
        leadGuestLastName: z.string().min(1).max(60).optional(),
        leadGuestEmail: z.string().email().optional(),
        leadGuestPhone: z.string().max(30).optional(),
        partnerReference: z.string().max(60).optional(),
        guestNames: z.array(guestName).max(40).optional(),
        arrival: flight,
        departure: flight,
        specialRequests: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirst({
        where: {
          id: input.id,
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          status: { in: ["CONFIRMED", "ON_REQUEST", "PENDING_APPROVAL"] },
        },
        select: { id: true, code: true, checkIn: true },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "That booking cannot be edited." });
      if (booking.checkIn <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The stay has started. Contact your account manager." });
      }

      const first = input.leadGuestFirstName;
      const last = input.leadGuestLastName;

      await ctx.db.booking.update({
        where: { id: booking.id },
        data: {
          ...(first !== undefined && { leadGuestFirstName: first }),
          ...(last !== undefined && { leadGuestLastName: last }),
          ...(first !== undefined || last !== undefined
            ? { leadGuestName: `${first ?? ""} ${last ?? ""}`.trim() }
            : {}),
          ...(input.leadGuestEmail !== undefined && { leadGuestEmail: input.leadGuestEmail }),
          ...(input.leadGuestPhone !== undefined && { leadGuestPhone: input.leadGuestPhone }),
          ...(input.partnerReference !== undefined && { partnerReference: input.partnerReference }),
          ...(input.guestNames !== undefined && { guestNames: input.guestNames as object }),
          ...(input.arrival !== undefined && {
            arrivalFlightNo: input.arrival?.flightNo ?? null,
            arrivalTime: input.arrival?.time ?? null,
            arrivalOriginApt: input.arrival?.originApt ?? null,
            arrivalDestApt: input.arrival?.destApt ?? null,
          }),
          ...(input.departure !== undefined && {
            departFlightNo: input.departure?.flightNo ?? null,
            departTime: input.departure?.time ?? null,
            departOriginApt: input.departure?.originApt ?? null,
            departDestApt: input.departure?.destApt ?? null,
          }),
          ...(input.specialRequests !== undefined && { specialRequests: input.specialRequests }),
        },
      });

      await ctx.db.bookingTimeline.create({
        data: {
          bookingId: booking.id,
          action: "PARTNER_DETAILS_UPDATED",
          details: "Guest, flight or reference details changed by the partner.",
          userId: ctx.partner.userId,
        },
      });

      await auditPartner("BOOKING_AMENDED", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: ctx.partner.userId,
        entityType: "Booking",
        entityId: booking.id,
        ip: ctx.clientIp,
        metadata: { code: booking.code, detailsOnly: true },
      });

      return { id: booking.id };
    }),

  /**
   * The room types and boards this booking's contract actually sells, so an
   * amendment offers real choices rather than the whole hotel catalogue.
   */
  roomOptions: partnerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirst({
        where: {
          id: input.id,
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
        },
        select: { contractId: true, hotelId: true },
      });
      if (!booking?.contractId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That booking is not on your account." });
      }

      const [roomTypes, mealBases] = await Promise.all([
        ctx.db.contractRoomType.findMany({
          where: { contractId: booking.contractId },
          select: {
            roomType: { select: { id: true, name: true, maxAdults: true, maxOccupancy: true } },
          },
        }),
        ctx.db.contractMealBasis.findMany({
          where: { contractId: booking.contractId },
          select: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
        }),
      ]);

      return {
        roomTypes: roomTypes.map((r) => r.roomType).filter(Boolean),
        mealBases: mealBases.map((m) => m.mealBasis).filter(Boolean),
      };
    }),

  /** What a change to dates, rooms or occupancy would cost — nothing moves. */
  quoteAmendment: bookingProcedure
    .input(amendmentInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await quotePartnerAmendment({
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          partnerUserId: ctx.partner.userId,
          bookingId: input.id,
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          rooms: input.rooms,
          ip: ctx.clientIp,
        });
      } catch (err) {
        throw amendmentError(err);
      }
    }),

  /** Applies the change the partner has just seen and accepted. */
  amend: bookingProcedure
    .input(amendmentInput.extend({ acceptedTotal: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await applyPartnerAmendment({
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          partnerUserId: ctx.partner.userId,
          bookingId: input.id,
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          rooms: input.rooms,
          acceptedTotal: input.acceptedTotal,
          ip: ctx.clientIp,
        });
      } catch (err) {
        throw amendmentError(err);
      }
    }),

  /** What cancelling would cost, before anyone commits to it. */
  cancellationPreview: partnerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        return await previewPartnerCancellation({
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          bookingId: input.id,
        });
      } catch (err) {
        throw amendmentError(err);
      }
    }),

  cancel: bookingProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await cancelPartnerBooking({
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          partnerUserId: ctx.partner.userId,
          bookingId: input.id,
          reason: input.reason,
          ip: ctx.clientIp,
        });
      } catch (err) {
        throw amendmentError(err);
      }
    }),
});
