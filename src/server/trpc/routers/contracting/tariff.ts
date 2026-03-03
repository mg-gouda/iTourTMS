import { z } from "zod";

import {
  tariffGenerateSchema,
  tariffBulkGenerateSchema,
} from "@/lib/validations/contracting";
import { dispatchTariffWebhook } from "@/server/services/contracting/webhook-dispatcher";
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

  // ── Preview: compute tariff rates without saving ──
  preview: proc
    .input(tariffGenerateSchema)
    .query(async ({ ctx, input }) => {
      const { generateTariffRates, resolveMarkupRule } = await import(
        "@/server/services/contracting/markup-calculator"
      );

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

      let markupRule = null;
      if (input.markupRuleId) {
        const rule = await ctx.db.markupRule.findFirstOrThrow({
          where: { id: input.markupRuleId, companyId: ctx.companyId },
        });
        markupRule = {
          id: rule.id, name: rule.name, markupType: rule.markupType,
          value: rule.value.toString(), contractId: rule.contractId,
          hotelId: rule.hotelId, destinationId: rule.destinationId,
          marketId: rule.marketId, tourOperatorId: rule.tourOperatorId,
          priority: rule.priority, active: rule.active,
          validFrom: rule.validFrom?.toISOString().slice(0, 10) ?? null,
          validTo: rule.validTo?.toISOString().slice(0, 10) ?? null,
        };
      } else {
        const allRules = await ctx.db.markupRule.findMany({
          where: { companyId: ctx.companyId, active: true },
        });
        const ruleData = allRules.map((r) => ({
          id: r.id, name: r.name, markupType: r.markupType,
          value: r.value.toString(), contractId: r.contractId,
          hotelId: r.hotelId, destinationId: r.destinationId,
          marketId: r.marketId, tourOperatorId: r.tourOperatorId,
          priority: r.priority, active: r.active,
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

      return generateTariffRates(
        {
          contractId: contract.id,
          contractName: contract.name,
          contractCode: contract.code,
          hotelName: contract.hotel.name,
          rateBasis: contract.rateBasis,
          seasons: contract.seasons.map((s) => ({
            id: s.id, dateFrom: s.dateFrom.toISOString().slice(0, 10), dateTo: s.dateTo.toISOString().slice(0, 10),
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
    }),

  // ── Generate a tariff ──
  generate: proc
    .input(tariffGenerateSchema)
    .mutation(async ({ ctx, input }) => {
      const { generateTariffRates, resolveMarkupRule } = await import(
        "@/server/services/contracting/markup-calculator"
      );

      // Fetch contract with all rate data + webhook-related relations
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
        include: {
          hotel: { select: { name: true, code: true, starRating: true, destinationId: true } },
          baseCurrency: { select: { code: true } },
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
          allotments: {
            include: {
              roomType: { select: { name: true, code: true } },
              season: { select: { dateFrom: true, dateTo: true } },
            },
          },
          cancellationPolicies: { orderBy: { daysBefore: "desc" } },
          childPolicies: { orderBy: { category: "asc" } },
          specialOffers: { orderBy: { sortOrder: "asc" } },
          stopSales: {
            include: { roomType: { select: { name: true, code: true } } },
          },
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
            dateFrom: s.dateFrom.toISOString().slice(0, 10),
            dateTo: s.dateTo.toISOString().slice(0, 10),
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

      const tariff = await ctx.db.tariff.create({
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

      // Dispatch webhook (fire-and-forget)
      dispatchTariffWebhook(
        ctx.db, ctx.companyId, tariff.id, input.name, contract, tariffData,
      );

      return tariff;
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
          hotel: { select: { name: true, code: true, starRating: true, destinationId: true } },
          baseCurrency: { select: { code: true } },
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
          allotments: {
            include: {
              roomType: { select: { name: true, code: true } },
              season: { select: { dateFrom: true, dateTo: true } },
            },
          },
          cancellationPolicies: { orderBy: { daysBefore: "desc" } },
          childPolicies: { orderBy: { category: "asc" } },
          specialOffers: { orderBy: { sortOrder: "asc" } },
          stopSales: {
            include: { roomType: { select: { name: true, code: true } } },
          },
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
            dateFrom: s.dateFrom.toISOString().slice(0, 10),
            dateTo: s.dateTo.toISOString().slice(0, 10),
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

      const tariff = await ctx.db.tariff.create({
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

      // Dispatch webhook (fire-and-forget)
      dispatchTariffWebhook(
        ctx.db, ctx.companyId, tariff.id, existing.name, contract, tariffData,
      );

      return tariff;
    }),

  // ── Contracts available for tariff generation (assigned to a TO) ──
  contractsForTariff: proc
    .input(
      z.object({
        tourOperatorId: z.string(),
        marketId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.db.contractTourOperator.findMany({
        where: { tourOperatorId: input.tourOperatorId },
        include: {
          contract: {
            include: {
              hotel: { select: { id: true, name: true, destinationId: true } },
              baseCurrency: { select: { id: true, code: true, name: true } },
              seasons: { orderBy: { sortOrder: "asc" } },
              markets: { select: { marketId: true } },
            },
          },
        },
      });

      let contracts = assignments.map((a) => a.contract);

      // Filter by market if provided
      if (input.marketId) {
        contracts = contracts.filter((c) =>
          c.markets.some((m) => m.marketId === input.marketId),
        );
      }

      return contracts;
    }),

  // ── Bulk generate: tariffs for all contracts assigned to a TO ──
  generateBulk: proc
    .input(tariffBulkGenerateSchema)
    .mutation(async ({ ctx, input }) => {
      const { generateTariffRates, resolveMarkupRule } = await import(
        "@/server/services/contracting/markup-calculator"
      );

      // Find all contracts assigned to this TO (with webhook-related relations)
      const assignments = await ctx.db.contractTourOperator.findMany({
        where: { tourOperatorId: input.tourOperatorId },
        include: {
          contract: {
            include: {
              hotel: { select: { name: true, code: true, starRating: true, destinationId: true } },
              baseCurrency: { select: { code: true } },
              seasons: { orderBy: { sortOrder: "asc" } },
              roomTypes: {
                include: {
                  roomType: {
                    select: { id: true, name: true, code: true },
                  },
                },
                orderBy: { sortOrder: "asc" },
              },
              mealBases: {
                include: {
                  mealBasis: {
                    select: { id: true, name: true, mealCode: true },
                  },
                },
                orderBy: { sortOrder: "asc" },
              },
              baseRates: true,
              supplements: true,
              markets: { select: { marketId: true } },
              allotments: {
                include: {
                  roomType: { select: { name: true, code: true } },
                  season: { select: { dateFrom: true, dateTo: true } },
                },
              },
              cancellationPolicies: { orderBy: { daysBefore: "desc" } },
              childPolicies: { orderBy: { category: "asc" } },
              specialOffers: { orderBy: { sortOrder: "asc" } },
              stopSales: {
                include: { roomType: { select: { name: true, code: true } } },
              },
            },
          },
        },
      });

      let contracts = assignments.map((a) => a.contract);

      // Filter by market
      if (input.marketId) {
        contracts = contracts.filter((c) =>
          c.markets.some((m) => m.marketId === input.marketId),
        );
      }

      if (contracts.length === 0) {
        throw new Error("No contracts found for this tour operator and market combination");
      }

      const tourOperator = await ctx.db.tourOperator.findFirstOrThrow({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
      });

      // Load markup rules once for auto-resolve
      let specifiedRule = null;
      let allRuleData: Parameters<typeof resolveMarkupRule>[0] = [];
      if (input.markupRuleId) {
        const rule = await ctx.db.markupRule.findFirstOrThrow({
          where: { id: input.markupRuleId, companyId: ctx.companyId },
        });
        specifiedRule = {
          id: rule.id, name: rule.name, markupType: rule.markupType,
          value: rule.value.toString(), contractId: rule.contractId,
          hotelId: rule.hotelId, destinationId: rule.destinationId,
          marketId: rule.marketId, tourOperatorId: rule.tourOperatorId,
          priority: rule.priority, active: rule.active,
          validFrom: rule.validFrom?.toISOString().slice(0, 10) ?? null,
          validTo: rule.validTo?.toISOString().slice(0, 10) ?? null,
        };
      } else {
        const allRules = await ctx.db.markupRule.findMany({
          where: { companyId: ctx.companyId, active: true },
        });
        allRuleData = allRules.map((r) => ({
          id: r.id, name: r.name, markupType: r.markupType,
          value: r.value.toString(), contractId: r.contractId,
          hotelId: r.hotelId, destinationId: r.destinationId,
          marketId: r.marketId, tourOperatorId: r.tourOperatorId,
          priority: r.priority, active: r.active,
          validFrom: r.validFrom?.toISOString().slice(0, 10) ?? null,
          validTo: r.validTo?.toISOString().slice(0, 10) ?? null,
        }));
      }

      const createdIds: string[] = [];

      for (const contract of contracts) {
        // Filter seasons if specified
        let seasons = contract.seasons;
        if (input.seasonDateFrom && input.seasonDateTo) {
          seasons = seasons.filter(
            (s) =>
              s.dateFrom.toISOString().slice(0, 10) === input.seasonDateFrom &&
              s.dateTo.toISOString().slice(0, 10) === input.seasonDateTo,
          );
        }

        if (seasons.length === 0) continue;

        // Resolve markup rule per contract
        const markupRule = specifiedRule
          ? specifiedRule
          : resolveMarkupRule(allRuleData, {
              contractId: contract.id,
              hotelId: contract.hotelId,
              destinationId: contract.hotel.destinationId,
              marketId: contract.markets[0]?.marketId ?? null,
              tourOperatorId: input.tourOperatorId,
            });

        const currencyCode = contract.baseCurrency?.code ?? "USD";

        const tariffData = generateTariffRates(
          {
            contractId: contract.id,
            contractName: contract.name,
            contractCode: contract.code,
            hotelName: contract.hotel.name,
            rateBasis: contract.rateBasis,
            seasons: seasons.map((s) => ({
              id: s.id,
              dateFrom: s.dateFrom.toISOString().slice(0, 10),
              dateTo: s.dateTo.toISOString().slice(0, 10),
            })),
            roomTypes: contract.roomTypes,
            mealBases: contract.mealBases,
            baseRates: contract.baseRates,
            supplements: contract.supplements,
          },
          { name: tourOperator.name, code: tourOperator.code },
          markupRule,
          currencyCode,
        );

        const tariffName = `${input.name} - ${contract.name}`;
        const tariff = await ctx.db.tariff.create({
          data: {
            companyId: ctx.companyId,
            name: tariffName,
            contractId: contract.id,
            tourOperatorId: input.tourOperatorId,
            markupRuleId: markupRule?.id ?? null,
            currencyCode,
            data: JSON.parse(JSON.stringify(tariffData)),
          },
        });

        // Dispatch webhook (fire-and-forget)
        dispatchTariffWebhook(
          ctx.db, ctx.companyId, tariff.id, tariffName, contract, tariffData,
        );

        createdIds.push(tariff.id);
      }

      return { count: createdIds.length, ids: createdIds };
    }),

  // ── Delete ──
  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tariff.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  // ── Bulk delete ──
  deleteBulk: proc
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.tariff.deleteMany({
        where: { id: { in: input.ids }, companyId: ctx.companyId },
      });
      return { count: result.count };
    }),
});
