import { z } from "zod";

import { marketCreateSchema, marketUpdateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const marketRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.market.findMany({
      where: { companyId: ctx.companyId },
      include: {
        _count: { select: { contracts: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.market.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contracts: {
            include: {
              contract: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  status: true,
                  validFrom: true,
                  validTo: true,
                  hotel: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    }),

  create: proc
    .input(marketCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.market.create({
        data: {
          ...input,
          companyId: ctx.companyId,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: marketUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.market.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.market.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractMarket.findMany({
        where: { contractId: input.contractId },
        include: {
          market: { select: { id: true, name: true, code: true, countryIds: true, active: true } },
        },
        orderBy: { market: { name: "asc" } },
      });
    }),

  assign: proc
    .input(z.object({ contractId: z.string(), marketIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      // Create contract-market assignments, skip duplicates
      const existing = await ctx.db.contractMarket.findMany({
        where: { contractId: input.contractId, marketId: { in: input.marketIds } },
        select: { marketId: true },
      });
      const existingIds = new Set(existing.map((e) => e.marketId));
      const newMarketIds = input.marketIds.filter((id) => !existingIds.has(id));

      if (newMarketIds.length > 0) {
        await ctx.db.contractMarket.createMany({
          data: newMarketIds.map((marketId) => ({
            contractId: input.contractId,
            marketId,
          })),
        });
      }

      return { assigned: newMarketIds.length };
    }),

  unassign: proc
    .input(z.object({ contractId: z.string(), marketId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractMarket.deleteMany({
        where: { contractId: input.contractId, marketId: input.marketId },
      });
    }),
});
