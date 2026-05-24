import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseMarkupRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [markets, tos] = await Promise.all([
        ctx.db.cruiseContractMarket.findMany({
          where: { contractId: input.contractId },
          include: { market: true },
        }),
        ctx.db.cruiseContractTourOperator.findMany({
          where: { contractId: input.contractId },
          include: { tourOperator: { select: { id: true, name: true, code: true } } },
        }),
      ]);
      return { markets, tourOperators: tos };
    }),

  saveMarketMarkup: p("nile-cruises:contract:update")
    .input(z.object({ contractId: z.string(), marketId: z.string(), markup: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContractMarket.update({
        where: { contractId_marketId: { contractId: input.contractId, marketId: input.marketId } },
        data: { markup: input.markup },
      });
    }),

  saveToMarkup: p("nile-cruises:contract:update")
    .input(z.object({ contractId: z.string(), tourOperatorId: z.string(), markup: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseContractTourOperator.update({
        where: { contractId_tourOperatorId: { contractId: input.contractId, tourOperatorId: input.tourOperatorId } },
        data: { markup: input.markup },
      });
    }),

  tariffPreview: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string(), markupPercent: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const rates = await ctx.db.cruiseBaseRate.findMany({
        where: { contractId: input.contractId },
        include: { season: true, cabinCategory: true },
      });
      return rates.map((r) => ({
        season: r.season.name,
        category: r.cabinCategory.name,
        netRate: Number(r.ratePerPaxPerNight),
        grossRate: Number(r.ratePerPaxPerNight) * (1 + input.markupPercent / 100),
        currency: r.currency,
      }));
    }),

  tariffExport: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseContract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
        include: {
          boat: { select: { id: true, name: true } },
          seasons: { orderBy: { dateFrom: "asc" } },
          baseRates: { include: { cabinCategory: true, season: true } },
          supplements: { include: { cabinCategory: true, season: true } },
          offers: { where: { active: true } },
        },
      });
    }),
});
