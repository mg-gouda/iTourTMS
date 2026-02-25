import { z } from "zod";

import {
  markupRuleCreateSchema,
  markupRuleUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const markupRuleRouter = createTRPCRouter({
  // ── List all markup rules ──
  list: proc.query(async ({ ctx }) => {
    return ctx.db.markupRule.findMany({
      where: { companyId: ctx.companyId },
      include: {
        contract: { select: { id: true, name: true, code: true } },
        hotel: { select: { id: true, name: true, code: true } },
        destination: { select: { id: true, name: true, code: true } },
        market: { select: { id: true, name: true, code: true } },
        tourOperator: { select: { id: true, name: true, code: true } },
        _count: { select: { tariffs: true } },
      },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });
  }),

  // ── Get by ID ──
  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.markupRule.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contract: { select: { id: true, name: true, code: true } },
          hotel: { select: { id: true, name: true, code: true } },
          destination: { select: { id: true, name: true, code: true } },
          market: { select: { id: true, name: true, code: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          tariffs: {
            select: {
              id: true,
              name: true,
              currencyCode: true,
              generatedAt: true,
              contract: { select: { id: true, name: true } },
              tourOperator: { select: { id: true, name: true } },
            },
            orderBy: { generatedAt: "desc" },
          },
        },
      });
    }),

  // ── Create ──
  create: proc
    .input(markupRuleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.markupRule.create({
        data: {
          companyId: ctx.companyId,
          name: input.name,
          markupType: input.markupType,
          value: input.value,
          contractId: input.contractId || null,
          hotelId: input.hotelId || null,
          destinationId: input.destinationId || null,
          marketId: input.marketId || null,
          tourOperatorId: input.tourOperatorId || null,
          priority: input.priority,
          active: input.active,
          validFrom: input.validFrom ? new Date(input.validFrom) : null,
          validTo: input.validTo ? new Date(input.validTo) : null,
        },
      });
    }),

  // ── Update ──
  update: proc
    .input(z.object({ id: z.string(), data: markupRuleUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (input.data.validFrom !== undefined)
        data.validFrom = input.data.validFrom ? new Date(input.data.validFrom) : null;
      if (input.data.validTo !== undefined)
        data.validTo = input.data.validTo ? new Date(input.data.validTo) : null;

      return ctx.db.markupRule.update({
        where: { id: input.id, companyId: ctx.companyId },
        data,
      });
    }),

  // ── Delete ──
  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.markupRule.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  // ── Resolve: find best-matching rule for a given context ──
  resolve: proc
    .input(
      z.object({
        contractId: z.string(),
        tourOperatorId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
        include: {
          hotel: { select: { destinationId: true } },
          markets: { select: { marketId: true } },
        },
      });

      // Import at runtime to avoid circular deps
      const { resolveMarkupRule } = await import(
        "@/server/services/contracting/markup-calculator"
      );

      const allRules = await ctx.db.markupRule.findMany({
        where: { companyId: ctx.companyId, active: true },
      });

      const ruleData = allRules.map((r) => ({
        id: r.id,
        name: r.name,
        markupType: r.markupType,
        value: r.value.toString(),
        contractId: r.contractId,
        hotelId: r.hotelId,
        destinationId: r.destinationId,
        marketId: r.marketId,
        tourOperatorId: r.tourOperatorId,
        priority: r.priority,
        active: r.active,
        validFrom: r.validFrom?.toISOString().slice(0, 10) ?? null,
        validTo: r.validTo?.toISOString().slice(0, 10) ?? null,
      }));

      const resolved = resolveMarkupRule(ruleData, {
        contractId: input.contractId,
        hotelId: contract.hotelId,
        destinationId: contract.hotel.destinationId,
        marketId: contract.markets[0]?.marketId ?? null,
        tourOperatorId: input.tourOperatorId,
      });

      return resolved;
    }),
});
