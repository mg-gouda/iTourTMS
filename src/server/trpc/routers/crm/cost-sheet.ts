import { z } from "zod";

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
        include: {
          _count: { select: { components: true } },
        },
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
      if (sheet.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
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
          calcBasis: input.calcBasis,
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
      if (sheet.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      const data: Record<string, unknown> = { ...input.data };
      if (data.validFrom !== undefined) data.validFrom = data.validFrom ? new Date(data.validFrom as string) : null;
      if (data.validTo !== undefined) data.validTo = data.validTo ? new Date(data.validTo as string) : null;
      if (data.notes !== undefined) data.notes = data.notes || null;

      return ctx.db.crmCostSheet.update({
        where: { id: input.id },
        data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findFirstOrThrow({
        where: { id: input.id },
        include: { excursion: { select: { companyId: true } } },
      });
      if (sheet.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.crmCostSheet.delete({ where: { id: input.id } });
    }),

  // Bulk delete-and-recreate components (same pattern as contracting supplements)
  saveComponents: proc
    .input(costComponentBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findFirstOrThrow({
        where: { id: input.costSheetId },
        include: { excursion: { select: { companyId: true } } },
      });
      if (sheet.excursion.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      await ctx.db.$transaction(async (tx) => {
        // Delete all existing components
        await tx.crmCostComponent.deleteMany({
          where: { costSheetId: input.costSheetId },
        });
        // Create new ones
        if (input.components.length > 0) {
          await tx.crmCostComponent.createMany({
            data: input.components.map((c, i) => ({
              costSheetId: input.costSheetId,
              type: c.type,
              description: c.description,
              supplierId: c.supplierId || null,
              unitCost: c.unitCost,
              quantity: c.quantity,
              total: c.total,
              sortOrder: c.sortOrder ?? i,
            })),
          });
        }
        // Update total on sheet
        const totalCost = input.components.reduce((sum, c) => sum + c.total, 0);
        await tx.crmCostSheet.update({
          where: { id: input.costSheetId },
          data: { totalCost },
        });
      });

      return { success: true };
    }),
});
