import { z } from "zod";

import { pickupLocationBulkSaveSchema } from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const pickupLocationRouter = createTRPCRouter({
  listByExcursion: proc
    .input(z.object({ excursionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmPickupLocation.findMany({
        where: { excursionId: input.excursionId },
        include: { transportTiers: { orderBy: { minPax: "asc" } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  // Bulk save: delete all for excursion, recreate. Tiers cascade.
  bulkSave: proc
    .input(pickupLocationBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });

      await ctx.db.$transaction(async (tx) => {
        await tx.crmPickupLocation.deleteMany({ where: { excursionId: input.excursionId } });

        for (const [i, loc] of input.locations.entries()) {
          const created = await tx.crmPickupLocation.create({
            data: {
              excursionId: input.excursionId,
              name: loc.name,
              sortOrder: loc.sortOrder ?? i,
            },
          });
          if (loc.tiers.length > 0) {
            await tx.crmTransportTier.createMany({
              data: loc.tiers.map((t, j) => ({
                pickupLocationId: created.id,
                vehicleName: t.vehicleName,
                minPax: t.minPax,
                maxPax: t.maxPax,
                unitCost: t.unitCost,
                currency: t.currency,
                exchangeRate: t.exchangeRate,
                sortOrder: t.sortOrder ?? j,
              })),
            });
          }
        }
      });

      return { success: true };
    }),
});
