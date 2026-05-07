import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const pickupTimeSheetRouter = createTRPCRouter({
  // All destinations that have at least one active hotel
  listDestinations: proc.query(async ({ ctx }) => {
    return ctx.db.destination.findMany({
      where: {
        companyId: ctx.companyId,
        active: true,
        hotels: { some: { companyId: ctx.companyId, active: true } },
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),

  // Hotels + excursions + existing pickup times for one destination
  getSheet: proc
    .input(z.object({ destinationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [hotels, excursions, times] = await Promise.all([
        ctx.db.hotel.findMany({
          where: { companyId: ctx.companyId, destinationId: input.destinationId, active: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: "asc" },
        }),
        ctx.db.crmExcursion.findMany({
          where: { companyId: ctx.companyId, active: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: "asc" },
        }),
        ctx.db.crmPickupTime.findMany({
          where: { companyId: ctx.companyId, destinationId: input.destinationId },
          select: { hotelId: true, excursionId: true, pickupTime: true },
        }),
      ]);

      return { hotels, excursions, times };
    }),

  // Bulk save: delete all for destination + recreate only non-empty cells
  saveSheet: proc
    .input(
      z.object({
        destinationId: z.string(),
        cells: z.array(
          z.object({
            hotelId: z.string(),
            excursionId: z.string(),
            pickupTime: z.string().regex(/^\d{2}:\d{2}$/),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(async (tx) => {
        await tx.crmPickupTime.deleteMany({
          where: { companyId: ctx.companyId, destinationId: input.destinationId },
        });
        if (input.cells.length > 0) {
          await tx.crmPickupTime.createMany({
            data: input.cells.map((c) => ({
              companyId: ctx.companyId,
              destinationId: input.destinationId,
              hotelId: c.hotelId,
              excursionId: c.excursionId,
              pickupTime: c.pickupTime,
            })),
          });
        }
      });
      return { saved: input.cells.length };
    }),
});
