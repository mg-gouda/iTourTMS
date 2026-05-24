import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseBulkSaveBaseRatesSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseBaseRateRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBaseRate.findMany({
        where: { contractId: input.contractId },
        include: {
          season: true,
          cabinCategory: true,
          market: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ season: { dateFrom: "asc" } }, { cabinCategory: { sortOrder: "asc" } }],
      });
    }),

  bulkSave: p("nile-cruises:contract:update")
    .input(cruiseBulkSaveBaseRatesSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseBaseRate.deleteMany({ where: { contractId: input.contractId } });
      if (input.rates.length === 0) return { count: 0 };
      return ctx.db.cruiseBaseRate.createMany({
        data: input.rates.map((r) => ({
          ...r,
          contractId: input.contractId,
          marketId: r.marketId ?? null,
        })),
      });
    }),

  getMatrix: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [rates, seasons, categories] = await Promise.all([
        ctx.db.cruiseBaseRate.findMany({ where: { contractId: input.contractId } }),
        ctx.db.cruiseSeason.findMany({ where: { contractId: input.contractId }, orderBy: { dateFrom: "asc" } }),
        ctx.db.cruiseCabinCategory.findMany({
          where: { boat: { contracts: { some: { id: input.contractId } } } },
          orderBy: { sortOrder: "asc" },
        }),
      ]);
      return { rates, seasons, categories };
    }),
});
