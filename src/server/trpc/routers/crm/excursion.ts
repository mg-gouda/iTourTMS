import { z } from "zod";

import { excursionCreateSchema, excursionUpdateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("crm");

export const excursionRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.crmExcursion.findMany({
      where: { companyId: ctx.companyId },
      include: {
        _count: {
          select: { programs: true, costSheets: true, ageGroups: true, addons: true },
        },
      },
      orderBy: { name: "asc" },
      take: 500,
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmExcursion.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          programs: {
            orderBy: { sortOrder: "asc" },
            include: {
              items: { orderBy: { sortOrder: "asc" } },
            },
          },
          ageGroups: { orderBy: { sortOrder: "asc" } },
          addons: { orderBy: { sortOrder: "asc" } },
          costSheets: {
            orderBy: { createdAt: "desc" },
            include: {
              components: {
                orderBy: { sortOrder: "asc" },
                include: { supplier: { select: { id: true, name: true } } },
              },
            },
          },
          pickupLocations: {
            orderBy: { sortOrder: "asc" },
            include: { transportTiers: { orderBy: { minPax: "asc" } } },
          },
        },
      });
    }),

  stats: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [bookingItems, revenueAgg] = await Promise.all([
        ctx.db.crmBookingItem.findMany({
          where: { excursionId: input.id },
          select: {
            quantity: true,
            totalPrice: true,
            totalCost: true,
            booking: { select: { status: true } },
          },
        }),
        ctx.db.crmBookingItem.aggregate({
          where: {
            excursionId: input.id,
            booking: { status: { in: ["CONFIRMED", "COMPLETED"] } },
          },
          _sum: { totalPrice: true, totalCost: true, quantity: true },
          _count: true,
        }),
      ]);

      const totalBookings = new Set(
        bookingItems.map((bi) => bi.booking)
      ).size;

      return {
        totalBookingItems: bookingItems.length,
        totalBookings,
        confirmedRevenue: Number(revenueAgg._sum.totalPrice ?? 0),
        confirmedCost: Number(revenueAgg._sum.totalCost ?? 0),
        totalPaxServed: Number(revenueAgg._sum.quantity ?? 0),
      };
    }),

  create: proc
    .input(excursionCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.crmExcursion.findFirst({
        where: { companyId: ctx.companyId, code: input.code },
      });
      if (existing) {
        throw new Error(`An excursion with code "${input.code}" already exists.`);
      }
      return ctx.db.crmExcursion.create({
        data: {
          code: input.code,
          name: input.name,
          productType: input.productType,
          category: input.category,
          tripMode: input.tripMode,
          duration: input.duration || null,
          description: input.description || null,
          inclusions: input.inclusions || null,
          exclusions: input.exclusions || null,
          minPax: input.minPax ?? 1,
          maxPax: input.maxPax ?? null,
          active: input.active,
          companyId: ctx.companyId,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: excursionUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.duration !== undefined) data.duration = data.duration || null;
      if (data.description !== undefined) data.description = data.description || null;
      if (data.inclusions !== undefined) data.inclusions = data.inclusions || null;
      if (data.exclusions !== undefined) data.exclusions = data.exclusions || null;
      if (data.maxPax !== undefined) data.maxPax = data.maxPax ?? null;

      return ctx.db.crmExcursion.update({
        where: { id: input.id, companyId: ctx.companyId },
        data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmExcursion.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
