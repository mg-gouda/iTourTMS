import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { sellingPriceBulkSaveSchema } from "@/lib/validations/crm";

const p = (code: string) => modulePermissionProcedure("crm", code);

export const sellingPriceRouter = createTRPCRouter({
  listByCostSheet: p("crm:excursion:read")
    .input(z.object({ costSheetId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findUnique({
        where: { id: input.costSheetId },
        include: { excursion: { select: { companyId: true } } },
      });
      if (!sheet || sheet.excursion.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.crmSellingPrice.findMany({
        where: { costSheetId: input.costSheetId },
        include: { ageGroup: true },
        orderBy: { sortOrder: "asc" },
      });
    }),

  save: p("crm:excursion:update")
    .input(sellingPriceBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const sheet = await ctx.db.crmCostSheet.findUnique({
        where: { id: input.costSheetId },
        include: { excursion: { select: { companyId: true } } },
      });
      if (!sheet || sheet.excursion.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.crmSellingPrice.deleteMany({
          where: { costSheetId: input.costSheetId },
        });

        if (input.prices.length > 0) {
          await tx.crmSellingPrice.createMany({
            data: input.prices.map((p) => ({
              costSheetId: input.costSheetId,
              ageGroupId: p.ageGroupId || null,
              label: p.label,
              markupType: p.markupType,
              markupValue: p.markupValue,
              costPerPerson: p.costPerPerson,
              sellingPrice: p.sellingPrice,
              currency: p.currency,
              active: p.active,
              sortOrder: p.sortOrder,
            })),
          });
        }

        return tx.crmSellingPrice.findMany({
          where: { costSheetId: input.costSheetId },
          orderBy: { sortOrder: "asc" },
        });
      });
    }),
});
