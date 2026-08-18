import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { createTRPCRouter, partnerProcedure } from "@/server/trpc";
import { MAX_STAY_NIGHTS, partnerSearch } from "@/server/services/b2b/partner-search";
import { partnerHotelIds } from "@/server/services/b2b/partner-search";

/**
 * The partner's search. `tourOperatorId` is never accepted from the client —
 * it comes off the session, so a partner cannot price another partner's deal.
 */
export const partnerSearchRouter = createTRPCRouter({
  /** Destinations the partner's allowlisted hotels sit in. */
  destinations: partnerProcedure.query(async ({ ctx }) => {
    const hotelIds = await partnerHotelIds(ctx.partner.tourOperatorId);
    if (hotelIds.length === 0) return [];

    const hotels = await ctx.db.hotel.findMany({
      where: { id: { in: hotelIds }, active: true, destinationId: { not: null } },
      select: { destination: { select: { id: true, name: true } } },
      distinct: ["destinationId"],
      orderBy: { destination: { name: "asc" } },
    });

    return hotels.flatMap((h) => (h.destination ? [h.destination] : []));
  }),

  availability: partnerProcedure
    .input(
      z.object({
        // Required: an unfiltered search across every contract is a scrape,
        // not a sale.
        destinationId: z.string().min(1),
        hotelId: z.string().optional(),
        checkIn: z.string().min(1),
        checkOut: z.string().min(1),
        adults: z.number().int().min(1).max(20).default(2),
        children: z.number().int().min(0).max(10).default(0),
        infants: z.number().int().min(0).max(10).default(0),
        childAges: z.array(z.number().int().min(0).max(17)).max(10).default([]),
        starRating: z.string().optional(),
        page: z.number().int().min(1).max(50).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const checkIn = new Date(input.checkIn);
      const checkOut = new Date(input.checkOut);
      const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);

      if (!Number.isFinite(nights) || nights < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Check-out must be after check-in." });
      }
      if (nights > MAX_STAY_NIGHTS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Stays longer than ${MAX_STAY_NIGHTS} nights have to be booked with your account manager.`,
        });
      }

      const result = await partnerSearch({
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        destinationId: input.destinationId,
        hotelId: input.hotelId,
        checkIn,
        checkOut,
        adults: input.adults,
        children: input.children,
        infants: input.infants,
        childAges: input.childAges,
        starRating: input.starRating,
        page: input.page,
      });

      // Only the first page is audited: paging through results is one search.
      if (input.page === 1) {
        void auditPartner("SEARCH_RUN", {
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          userId: ctx.partner.userId,
          ip: ctx.clientIp,
          metadata: {
            destinationId: input.destinationId,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            results: result.total,
          },
        });
      }

      return result;
    }),
});
