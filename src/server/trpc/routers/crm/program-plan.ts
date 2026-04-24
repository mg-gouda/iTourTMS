import { z } from "zod";

import {
  programPlanCreateSchema,
  programPlanSaveItemsSchema,
  programPlanUpdateSchema,
} from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const programPlanRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.crmProgramPlan.findMany({
      where: { companyId: ctx.companyId },
      include: {
        market: { select: { id: true, name: true, code: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmProgramPlan.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          market: { select: { id: true, name: true, code: true } },
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              excursion: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  productType: true,
                  category: true,
                  minPax: true,
                  maxPax: true,
                  active: true,
                  costSheets: {
                    where: { sellingPrices: { some: { active: true } } },
                    select: {
                      id: true,
                      name: true,
                      seasonType: true,
                      nationalityTier: true,
                      tripMode: true,
                      sellingPrices: {
                        where: { active: true },
                        select: {
                          id: true,
                          label: true,
                          sellingPrice: true,
                          currency: true,
                          costPerPerson: true,
                        },
                        orderBy: { sortOrder: "asc" },
                      },
                    },
                  },
                },
              },
              sellingPrice: {
                select: {
                  id: true,
                  label: true,
                  sellingPrice: true,
                  currency: true,
                },
              },
            },
          },
        },
      });
    }),

  create: proc
    .input(programPlanCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmProgramPlan.create({
        data: {
          companyId: ctx.companyId,
          name: input.name,
          description: input.description || null,
          marketId: input.marketId || null,
          active: input.active,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: programPlanUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmProgramPlan.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      return ctx.db.crmProgramPlan.update({
        where: { id: input.id },
        data: {
          name: input.data.name,
          description: input.data.description ?? null,
          marketId: input.data.marketId || null,
          active: input.data.active,
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmProgramPlan.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      return ctx.db.crmProgramPlan.delete({ where: { id: input.id } });
    }),

  // Bulk save items: delete all existing + recreate
  saveItems: proc
    .input(programPlanSaveItemsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmProgramPlan.findFirstOrThrow({
        where: { id: input.programPlanId, companyId: ctx.companyId },
      });
      await ctx.db.$transaction(async (tx) => {
        await tx.crmProgramPlanItem.deleteMany({
          where: { programPlanId: input.programPlanId },
        });
        if (input.items.length > 0) {
          await tx.crmProgramPlanItem.createMany({
            data: input.items.map((item, i) => ({
              programPlanId: input.programPlanId,
              excursionId: item.excursionId,
              sellingPriceId: item.sellingPriceId || null,
              minToOperate: item.minToOperate,
              operatingDays: item.operatingDays,
              sortOrder: item.sortOrder ?? i,
              notes: item.notes || null,
            })),
          });
        }
      });
      return { success: true };
    }),

  // Fetch markets for the dropdown (reuse contracting Market)
  listMarkets: proc.query(async ({ ctx }) => {
    return ctx.db.market.findMany({
      where: { companyId: ctx.companyId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),
});
