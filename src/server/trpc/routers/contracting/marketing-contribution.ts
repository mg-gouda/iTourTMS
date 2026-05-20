import { z } from "zod";

import {
  marketingContributionCreateSchema,
  marketingContributionUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("contracting", code);

export const marketingContributionRouter = createTRPCRouter({
  // ── List by contract ──
  listByContract: p("contracting:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractMarketingContribution.findMany({
        where: { contractId: input.contractId },
        include: {
          market: { select: { id: true, name: true, code: true } },
          season: { select: { id: true, dateFrom: true, dateTo: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  // ── Create ──
  create: p("contracting:contract:create")
    .input(marketingContributionCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractMarketingContribution.create({
        data: {
          contractId: input.contractId,
          marketId: input.marketId ?? null,
          seasonId: input.seasonId ?? null,
          valueType: input.valueType,
          value: input.value,
          notes: input.notes ?? null,
        },
      });
    }),

  // ── Update ──
  update: p("contracting:contract:update")
    .input(z.object({ id: z.string(), data: marketingContributionUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.contractMarketingContribution.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (existing.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      return ctx.db.contractMarketingContribution.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  // ── Delete ──
  delete: p("contracting:contract:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.contractMarketingContribution.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (existing.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      return ctx.db.contractMarketingContribution.delete({
        where: { id: input.id },
      });
    }),
});
