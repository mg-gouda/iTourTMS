import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, partnerProcedure, partnerRoleProcedure } from "@/server/trpc";
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
});
