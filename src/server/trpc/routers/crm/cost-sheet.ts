import { z } from "zod";
import { Decimal } from "decimal.js";

import { costSheetCreateSchema, costSheetUpdateSchema, costComponentBulkSaveSchema } from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const costSheetRouter = createTRPCRouter({
  listByExcursion: proc
    .input(z.object({ excursionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmCostSheet.findMany({
        where: { excursionId: input.excursionId },
        include: { _count: { select: { components: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findFirstOrThrow({
        where: { id: input.id },
        include: {
          excursion: { select: { companyId: true, name: true, code: true } },
          components: {
            orderBy: { sortOrder: "asc" },
            include: { supplier: { select: { id: true, name: true } } },
          },
        },
      });
      if (sheet.excursion.companyId !== ctx.companyId) throw new Error("Not found");
      return sheet;
    }),

  create: proc
    .input(costSheetCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.excursionId, companyId: ctx.companyId },
      });
      return ctx.db.crmCostSheet.create({
        data: {
          excursionId: input.excursionId,
          name: input.name,
          seasonType: input.seasonType,
          nationalityTier: input.nationalityTier,
          tripMode: input.tripMode,
          validFrom: input.validFrom ? new Date(input.validFrom) : null,
          validTo: input.validTo ? new Date(input.validTo) : null,
          referencePax: input.referencePax,
          baseCurrency: input.baseCurrency,
          notes: input.notes || null,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: costSheetUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findFirstOrThrow({
        where: { id: input.id },
        include: { excursion: { select: { companyId: true } } },
      });
      if (sheet.excursion.companyId !== ctx.companyId) throw new Error("Not found");
      const data: Record<string, unknown> = { ...input.data };
      if (data.validFrom !== undefined) data.validFrom = data.validFrom ? new Date(data.validFrom as string) : null;
      if (data.validTo !== undefined) data.validTo = data.validTo ? new Date(data.validTo as string) : null;
      if (data.notes !== undefined) data.notes = data.notes || null;
      return ctx.db.crmCostSheet.update({ where: { id: input.id }, data });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findFirstOrThrow({
        where: { id: input.id },
        include: { excursion: { select: { companyId: true } } },
      });
      if (sheet.excursion.companyId !== ctx.companyId) throw new Error("Not found");
      return ctx.db.crmCostSheet.delete({ where: { id: input.id } });
    }),

  saveComponents: proc
    .input(costComponentBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findFirstOrThrow({
        where: { id: input.costSheetId },
        include: { excursion: { select: { companyId: true } } },
      });
      if (sheet.excursion.companyId !== ctx.companyId) throw new Error("Not found");

      await ctx.db.$transaction(async (tx) => {
        await tx.crmCostComponent.deleteMany({ where: { costSheetId: input.costSheetId } });

        if (input.components.length > 0) {
          await tx.crmCostComponent.createMany({
            data: input.components.map((c, i) => ({
              costSheetId: input.costSheetId,
              costType: c.costType,
              pricingType: c.pricingType,
              description: c.description,
              supplierId: c.supplierId || null,
              qty: c.qty,
              unitCost: c.unitCost,
              currency: c.currency,
              exchangeRate: c.exchangeRate,
              sortOrder: c.sortOrder ?? i,
            })),
          });
        }

        // Recalculate totalCost = sum of per-pax costs (BULK ÷ referencePax, PER_PAX as-is) in baseCurrency
        const referencePax = sheet.referencePax ?? 10;
        const totalCost = input.components.reduce((sum, c) => {
          const lineUsd = new Decimal(c.unitCost).times(c.qty).times(c.exchangeRate);
          const perPax = c.pricingType === "BULK"
            ? lineUsd.dividedBy(referencePax)
            : lineUsd;
          return sum.plus(perPax);
        }, new Decimal(0));

        await tx.crmCostSheet.update({
          where: { id: input.costSheetId },
          data: { totalCost: totalCost.toDecimalPlaces(2) },
        });
      });

      return { success: true };
    }),

  // Recalculate totalCost for a different pax count (used by selling price editor)
  calculateCost: proc
    .input(z.object({ id: z.string(), paxCount: z.number().int().min(1) }))
    .query(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findFirstOrThrow({
        where: { id: input.id },
        include: {
          excursion: {
            select: {
              companyId: true,
              pickupLocations: {
                include: { transportTiers: { orderBy: { minPax: "asc" } } },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          components: true,
        },
      });
      if (sheet.excursion.companyId !== ctx.companyId) throw new Error("Not found");

      // Fixed cost per pax
      const fixedPerPax = sheet.components.reduce((sum, c) => {
        const line = new Decimal(c.unitCost.toString()).times(c.qty).times(c.exchangeRate.toString());
        return sum.plus(c.pricingType === "BULK" ? line.dividedBy(input.paxCount) : line);
      }, new Decimal(0));

      // Transport per pax per pickup location
      const transport = sheet.excursion.pickupLocations.map((loc) => {
        const tier = loc.transportTiers.find(
          (t) => input.paxCount >= t.minPax && input.paxCount <= t.maxPax,
        );
        const transportPerPax = tier
          ? new Decimal(tier.unitCost.toString()).times(tier.exchangeRate.toString()).dividedBy(input.paxCount)
          : new Decimal(0);
        return {
          locationId: loc.id,
          locationName: loc.name,
          vehicleName: tier?.vehicleName ?? null,
          transportPerPax: transportPerPax.toDecimalPlaces(2).toNumber(),
          totalPerPax: fixedPerPax.plus(transportPerPax).toDecimalPlaces(2).toNumber(),
        };
      });

      return {
        paxCount: input.paxCount,
        fixedPerPax: fixedPerPax.toDecimalPlaces(2).toNumber(),
        transport,
      };
    }),
});
