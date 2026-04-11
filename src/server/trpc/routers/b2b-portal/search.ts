import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { searchAvailability } from "@/server/services/b2c/availability";

const proc = moduleProcedure("b2b-portal");

export const searchRouter = createTRPCRouter({
  availability: proc
    .input(
      z.object({
        destinationId: z.string().optional(),
        checkIn: z.string().min(1),
        checkOut: z.string().min(1),
        adults: z.number().int().min(1).default(2),
        children: z.number().int().min(0).default(0),
        childAges: z.array(z.number().int().min(0).max(17)).default([]),
        starRating: z.string().optional(),
        tourOperatorId: z.string().optional(),
        page: z.number().int().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await searchAvailability({
        companyId: ctx.companyId,
        destinationId: input.destinationId || undefined,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
        adults: input.adults,
        children: input.children,
        childAges: input.childAges,
        starRating: input.starRating,
        page: input.page,
        pageSize: 20,
        sort: "price_asc",
      });

      // Strip B2C markup — B2B uses net rates
      for (const hotel of result.hotels) {
        for (const room of hotel.rooms) {
          room.displayTotal = room.total;
          room.markupAmount = 0;
          room.pricePerNight = room.total / hotel.nights;
        }
        hotel.cheapestTotal = Math.min(...hotel.rooms.map((r) => r.total));
        hotel.cheapestPerNight = hotel.cheapestTotal / hotel.nights;
      }

      return result;
    }),
});
