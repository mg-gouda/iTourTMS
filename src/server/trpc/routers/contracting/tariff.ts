import { z } from "zod";

import { tariffGenerateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const tariffRouter = createTRPCRouter({
  // ── List all tariffs ──
  list: proc.query(async ({ ctx }) => {
    return ctx.db.tariff.findMany({
      where: { companyId: ctx.companyId },
      include: {
        contract: { select: { id: true, name: true, code: true } },
        tourOperator: { select: { id: true, name: true, code: true } },
        markupRule: { select: { id: true, name: true, markupType: true, value: true } },
      },
      orderBy: { generatedAt: "desc" },
    });
  }),

  // ── Get by ID ──
  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.tariff.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contract: {
            select: {
              id: true,
              name: true,
              code: true,
              rateBasis: true,
              hotel: { select: { name: true } },
            },
          },
          tourOperator: { select: { id: true, name: true, code: true } },
          markupRule: { select: { id: true, name: true, markupType: true, value: true } },
        },
      });
    }),

  // ── Generate a tariff ──
  generate: proc
    .input(tariffGenerateSchema)
    .mutation(async ({ ctx, input }) => {
      const { generateTariffRates, resolveMarkupRule } = await import(
        "@/server/services/contracting/markup-calculator"
      );

      // Fetch contract with all rate data
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
        include: {
          hotel: { select: { name: true, destinationId: true } },
          seasons: { orderBy: { sortOrder: "asc" } },
          roomTypes: {
            include: { roomType: { select: { id: true, name: true, code: true } } },
            orderBy: { sortOrder: "asc" },
          },
          mealBases: {
            include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
            orderBy: { sortOrder: "asc" },
          },
          baseRates: true,
          supplements: true,
          markets: { select: { marketId: true } },
        },
      });

      const tourOperator = await ctx.db.tourOperator.findFirstOrThrow({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
      });

      // Resolve or use the specified markup rule
      let markupRule = null;
      if (input.markupRuleId) {
        const rule = await ctx.db.markupRule.findFirstOrThrow({
          where: { id: input.markupRuleId, companyId: ctx.companyId },
        });
        markupRule = {
          id: rule.id,
          name: rule.name,
          markupType: rule.markupType,
          value: rule.value.toString(),
          contractId: rule.contractId,
          hotelId: rule.hotelId,
          destinationId: rule.destinationId,
          marketId: rule.marketId,
          tourOperatorId: rule.tourOperatorId,
          priority: rule.priority,
          active: rule.active,
          validFrom: rule.validFrom?.toISOString().slice(0, 10) ?? null,
          validTo: rule.validTo?.toISOString().slice(0, 10) ?? null,
        };
      } else {
        // Auto-resolve
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

        markupRule = resolveMarkupRule(ruleData, {
          contractId: input.contractId,
          hotelId: contract.hotelId,
          destinationId: contract.hotel.destinationId,
          marketId: contract.markets[0]?.marketId ?? null,
          tourOperatorId: input.tourOperatorId,
        });
      }

      const tariffData = generateTariffRates(
        {
          contractId: contract.id,
          contractName: contract.name,
          contractCode: contract.code,
          hotelName: contract.hotel.name,
          rateBasis: contract.rateBasis,
          seasons: contract.seasons.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
          })),
          roomTypes: contract.roomTypes,
          mealBases: contract.mealBases,
          baseRates: contract.baseRates,
          supplements: contract.supplements,
        },
        { name: tourOperator.name, code: tourOperator.code },
        markupRule,
        input.currencyCode,
      );

      return ctx.db.tariff.create({
        data: {
          companyId: ctx.companyId,
          name: input.name,
          contractId: input.contractId,
          tourOperatorId: input.tourOperatorId,
          markupRuleId: markupRule?.id ?? null,
          currencyCode: input.currencyCode,
          data: JSON.parse(JSON.stringify(tariffData)),
        },
      });
    }),

  // ── Regenerate: delete + recreate ──
  regenerate: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.tariff.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });

      // Delete old
      await ctx.db.tariff.delete({ where: { id: input.id } });

      // Re-generate with same params
      const { generateTariffRates, resolveMarkupRule } = await import(
        "@/server/services/contracting/markup-calculator"
      );

      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: existing.contractId, companyId: ctx.companyId },
        include: {
          hotel: { select: { name: true, destinationId: true } },
          seasons: { orderBy: { sortOrder: "asc" } },
          roomTypes: {
            include: { roomType: { select: { id: true, name: true, code: true } } },
            orderBy: { sortOrder: "asc" },
          },
          mealBases: {
            include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
            orderBy: { sortOrder: "asc" },
          },
          baseRates: true,
          supplements: true,
          markets: { select: { marketId: true } },
        },
      });

      const tourOperator = await ctx.db.tourOperator.findFirstOrThrow({
        where: { id: existing.tourOperatorId, companyId: ctx.companyId },
      });

      let markupRule = null;
      if (existing.markupRuleId) {
        const rule = await ctx.db.markupRule.findFirst({
          where: { id: existing.markupRuleId, companyId: ctx.companyId },
        });
        if (rule) {
          markupRule = {
            id: rule.id,
            name: rule.name,
            markupType: rule.markupType,
            value: rule.value.toString(),
            contractId: rule.contractId,
            hotelId: rule.hotelId,
            destinationId: rule.destinationId,
            marketId: rule.marketId,
            tourOperatorId: rule.tourOperatorId,
            priority: rule.priority,
            active: rule.active,
            validFrom: rule.validFrom?.toISOString().slice(0, 10) ?? null,
            validTo: rule.validTo?.toISOString().slice(0, 10) ?? null,
          };
        }
      } else {
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
        markupRule = resolveMarkupRule(ruleData, {
          contractId: existing.contractId,
          hotelId: contract.hotelId,
          destinationId: contract.hotel.destinationId,
          marketId: contract.markets[0]?.marketId ?? null,
          tourOperatorId: existing.tourOperatorId,
        });
      }

      const tariffData = generateTariffRates(
        {
          contractId: contract.id,
          contractName: contract.name,
          contractCode: contract.code,
          hotelName: contract.hotel.name,
          rateBasis: contract.rateBasis,
          seasons: contract.seasons.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
          })),
          roomTypes: contract.roomTypes,
          mealBases: contract.mealBases,
          baseRates: contract.baseRates,
          supplements: contract.supplements,
        },
        { name: tourOperator.name, code: tourOperator.code },
        markupRule,
        existing.currencyCode,
      );

      return ctx.db.tariff.create({
        data: {
          companyId: ctx.companyId,
          name: existing.name,
          contractId: existing.contractId,
          tourOperatorId: existing.tourOperatorId,
          markupRuleId: markupRule?.id ?? null,
          currencyCode: existing.currencyCode,
          data: JSON.parse(JSON.stringify(tariffData)),
        },
      });
    }),

  // ── Delete ──
  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tariff.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
