import { z } from "zod";

import {
  programPlanCreateSchema,
  programPlanSaveItemsSchema,
  programPlanUpdateSchema,
} from "@/lib/validations/crm";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("crm", code);

export const programPlanRouter = createTRPCRouter({
  list: p("crm:excursion:read").query(async ({ ctx }) => {
    return ctx.db.crmProgramPlan.findMany({
      where: { companyId: ctx.companyId },
      include: {
        market: { select: { id: true, name: true, code: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: p("crm:excursion:read")
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

  create: p("crm:excursion:create")
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

  update: p("crm:excursion:update")
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

  delete: p("crm:excursion:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmProgramPlan.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      return ctx.db.crmProgramPlan.delete({ where: { id: input.id } });
    }),

  // Bulk save items: delete all existing + recreate
  saveItems: p("crm:excursion:update")
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
  listMarkets: p("crm:excursion:read").query(async ({ ctx }) => {
    return ctx.db.market.findMany({
      where: { companyId: ctx.companyId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),

  // List all tour operators with their program assignments for a given plan
  listTourOperators: p("crm:excursion:read")
    .input(z.object({ programPlanId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.crmProgramPlan.findFirstOrThrow({
        where: { id: input.programPlanId, companyId: ctx.companyId },
      });
      const [allTOs, assigned] = await Promise.all([
        ctx.db.tourOperator.findMany({
          where: { companyId: ctx.companyId, active: true },
          select: { id: true, name: true, code: true, marketId: true, market: { select: { name: true } } },
          orderBy: { name: "asc" },
        }),
        ctx.db.crmProgramTourOperator.findMany({
          where: { programPlanId: input.programPlanId },
          select: { tourOperatorId: true, id: true },
        }),
      ]);
      const assignedIds = new Set(assigned.map((a) => a.tourOperatorId));
      return allTOs.map((to) => ({
        ...to,
        assigned: assignedIds.has(to.id),
        assignmentId: assigned.find((a) => a.tourOperatorId === to.id)?.id ?? null,
      }));
    }),

  assignTO: p("crm:excursion:update")
    .input(z.object({ programPlanId: z.string(), tourOperatorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.crmProgramPlan.findFirstOrThrow({
        where: { id: input.programPlanId, companyId: ctx.companyId },
      });
      return ctx.db.crmProgramTourOperator.create({
        data: { programPlanId: input.programPlanId, tourOperatorId: input.tourOperatorId },
      });
    }),

  unassignTO: p("crm:excursion:update")
    .input(z.object({ programPlanId: z.string(), tourOperatorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmProgramTourOperator.deleteMany({
        where: { programPlanId: input.programPlanId, tourOperatorId: input.tourOperatorId },
      });
    }),

  // Summary for to-assign page: all plans with their assigned TO count
  listWithTOCount: p("crm:excursion:read").query(async ({ ctx }) => {
    return ctx.db.crmProgramPlan.findMany({
      where: { companyId: ctx.companyId },
      include: {
        market: { select: { name: true } },
        _count: { select: { tourOperators: true, items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),
});
