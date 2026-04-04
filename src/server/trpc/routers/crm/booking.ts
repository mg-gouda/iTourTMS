import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { bookingCreateSchema, bookingItemSchema, bookingUpdateSchema } from "@/lib/validations/crm";

async function recalcCustomerLifetimeValue(
  db: PrismaClient,
  customerId: string | null,
) {
  if (!customerId) return;
  const agg = await db.crmBooking.aggregate({
    where: { customerId, status: { in: ["CONFIRMED", "COMPLETED"] } },
    _sum: { totalSelling: true },
  });
  await db.crmCustomer.update({
    where: { id: customerId },
    data: { lifetimeValue: agg._sum.totalSelling ?? 0 },
  });
}

export const bookingRouter = createTRPCRouter({
  list: moduleProcedure("crm").query(async ({ ctx }) => {
    return ctx.db.crmBooking.findMany({
      where: { companyId: ctx.companyId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        bookedBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }),

  getById: moduleProcedure("crm")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.crmBooking.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          opportunity: { select: { id: true, title: true } },
          bookedBy: { select: { id: true, name: true } },
          items: {
            include: {
              excursion: { select: { id: true, code: true, name: true } },
            },
            orderBy: { sortOrder: "asc" },
          },
          activities: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!booking || booking.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return booking;
    }),

  create: moduleProcedure("crm")
    .input(bookingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "booking" } },
        create: { companyId: ctx.companyId, code: "booking", prefix: "BK", padding: 5, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
      });
      const num = seq.nextNumber - 1;
      const code = `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;

      const { items, ...bookingData } = input;

      const totalCost = items.reduce((s, i) => s + i.totalCost, 0);
      const totalSelling = items.reduce((s, i) => s + i.totalPrice, 0);

      const booking = await ctx.db.crmBooking.create({
        data: {
          companyId: ctx.companyId,
          code,
          customerId: bookingData.customerId || null,
          opportunityId: bookingData.opportunityId || null,
          status: bookingData.status,
          travelDate: new Date(bookingData.travelDate),
          paxAdults: bookingData.paxAdults,
          paxChildren: bookingData.paxChildren,
          paxInfants: bookingData.paxInfants,
          totalCost,
          totalSelling,
          currency: bookingData.currency,
          notes: bookingData.notes || null,
          bookedById: ctx.user.id,
          items: {
            createMany: {
              data: items.map((item, i) => ({
                excursionId: item.excursionId,
                costSheetId: item.costSheetId || null,
                label: item.label,
                quantity: item.quantity,
                unitCost: item.unitCost,
                unitPrice: item.unitPrice,
                totalCost: item.totalCost,
                totalPrice: item.totalPrice,
                sortOrder: i,
              })),
            },
          },
        },
        include: { items: true },
      });
      await recalcCustomerLifetimeValue(ctx.db, booking.customerId);
      return booking;
    }),

  update: moduleProcedure("crm")
    .input(z.object({ id: z.string(), data: bookingUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.crmBooking.findUnique({ where: { id: input.id } });
      if (!existing || existing.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const updated = await ctx.db.crmBooking.update({
        where: { id: input.id },
        data: {
          ...input.data,
          customerId: input.data.customerId === "" ? null : input.data.customerId,
          opportunityId: input.data.opportunityId === "" ? null : input.data.opportunityId,
          travelDate: input.data.travelDate ? new Date(input.data.travelDate) : undefined,
        },
      });
      await recalcCustomerLifetimeValue(ctx.db, existing.customerId);
      if (updated.customerId && updated.customerId !== existing.customerId) {
        await recalcCustomerLifetimeValue(ctx.db, updated.customerId);
      }
      return updated;
    }),

  updateWithItems: moduleProcedure("crm")
    .input(z.object({
      id: z.string(),
      data: bookingUpdateSchema,
      items: z.array(bookingItemSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.crmBooking.findUnique({ where: { id: input.id } });
      if (!existing || existing.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const totalCost = input.items.reduce((s, i) => s + i.totalCost, 0);
      const totalSelling = input.items.reduce((s, i) => s + i.totalPrice, 0);

      // Delete all existing items, recreate
      await ctx.db.crmBookingItem.deleteMany({ where: { bookingId: input.id } });

      const updated = await ctx.db.crmBooking.update({
        where: { id: input.id },
        data: {
          ...input.data,
          customerId: input.data.customerId === "" ? null : input.data.customerId,
          opportunityId: input.data.opportunityId === "" ? null : input.data.opportunityId,
          travelDate: input.data.travelDate ? new Date(input.data.travelDate) : undefined,
          totalCost,
          totalSelling,
          items: {
            createMany: {
              data: input.items.map((item, i) => ({
                excursionId: item.excursionId,
                costSheetId: item.costSheetId || null,
                label: item.label,
                quantity: item.quantity,
                unitCost: item.unitCost,
                unitPrice: item.unitPrice,
                totalCost: item.totalCost,
                totalPrice: item.totalPrice,
                sortOrder: i,
              })),
            },
          },
        },
        include: { items: true },
      });
      await recalcCustomerLifetimeValue(ctx.db, existing.customerId);
      return updated;
    }),

  delete: moduleProcedure("crm")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.crmBooking.findUnique({ where: { id: input.id } });
      if (!existing || existing.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const deleted = await ctx.db.crmBooking.delete({ where: { id: input.id } });
      await recalcCustomerLifetimeValue(ctx.db, existing.customerId);
      return deleted;
    }),

  clone: moduleProcedure("crm")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.crmBooking.findUnique({
        where: { id: input.id },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
      if (!source || source.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "booking" } },
        create: { companyId: ctx.companyId, code: "booking", prefix: "BK", padding: 5, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
      });
      const num = seq.nextNumber - 1;
      const code = `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;

      return ctx.db.crmBooking.create({
        data: {
          companyId: ctx.companyId,
          code,
          customerId: source.customerId,
          opportunityId: source.opportunityId,
          status: "DRAFT",
          travelDate: source.travelDate,
          paxAdults: source.paxAdults,
          paxChildren: source.paxChildren,
          paxInfants: source.paxInfants,
          totalCost: source.totalCost,
          totalSelling: source.totalSelling,
          currency: source.currency,
          notes: source.notes,
          bookedById: ctx.user.id,
          items: {
            createMany: {
              data: source.items.map((item, i) => ({
                excursionId: item.excursionId,
                costSheetId: item.costSheetId,
                label: item.label,
                quantity: item.quantity,
                unitCost: item.unitCost,
                unitPrice: item.unitPrice,
                totalCost: item.totalCost,
                totalPrice: item.totalPrice,
                sortOrder: i,
              })),
            },
          },
        },
      });
    }),

  dashboard: moduleProcedure("crm").query(async ({ ctx }) => {
    const [total, confirmed, draft, upcoming, recentBookings, revenueAgg, costAgg] = await Promise.all([
      ctx.db.crmBooking.count({ where: { companyId: ctx.companyId } }),
      ctx.db.crmBooking.count({ where: { companyId: ctx.companyId, status: "CONFIRMED" } }),
      ctx.db.crmBooking.count({ where: { companyId: ctx.companyId, status: "DRAFT" } }),
      ctx.db.crmBooking.count({
        where: { companyId: ctx.companyId, status: "CONFIRMED", travelDate: { gte: new Date() } },
      }),
      ctx.db.crmBooking.findMany({
        where: { companyId: ctx.companyId },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      ctx.db.crmBooking.aggregate({
        where: { companyId: ctx.companyId, status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalSelling: true },
      }),
      ctx.db.crmBooking.aggregate({
        where: { companyId: ctx.companyId, status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalCost: true },
      }),
    ]);
    const totalRevenue = Number(revenueAgg._sum.totalSelling ?? 0);
    const totalCost = Number(costAgg._sum.totalCost ?? 0);
    return { total, confirmed, draft, upcoming, recentBookings, totalRevenue, totalCost };
  }),

  alerts: moduleProcedure("crm").query(async ({ ctx }) => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const [upcomingBookings, overdueActivities] = await Promise.all([
      ctx.db.crmBooking.findMany({
        where: {
          companyId: ctx.companyId,
          status: "CONFIRMED",
          travelDate: { gte: now, lte: weekFromNow },
        },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { travelDate: "asc" },
        take: 10,
      }),
      ctx.db.crmActivity.findMany({
        where: {
          companyId: ctx.companyId,
          completedAt: null,
          dueDate: { lt: now },
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          lead: { select: { id: true, firstName: true, lastName: true, code: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          booking: { select: { id: true, code: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);

    return { upcomingBookings, overdueActivities };
  }),

  getExcursionPricing: moduleProcedure("crm")
    .input(z.object({ excursionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const excursion = await ctx.db.crmExcursion.findUnique({
        where: { id: input.excursionId },
        select: {
          id: true,
          name: true,
          companyId: true,
          costSheets: {
            include: {
              sellingPrices: {
                where: { active: true },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!excursion || excursion.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return excursion;
    }),

  // ── Status transitions with validation ──

  transition: moduleProcedure("crm")
    .input(
      z.object({
        id: z.string(),
        action: z.enum(["confirm", "cancel", "complete", "reopen"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.crmBooking.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

      const transitions: Record<string, Record<string, string>> = {
        DRAFT: { confirm: "CONFIRMED", cancel: "CANCELLED" },
        CONFIRMED: { complete: "COMPLETED", cancel: "CANCELLED" },
        CANCELLED: { reopen: "DRAFT" },
        COMPLETED: {},
      };

      const allowed = transitions[booking.status];
      if (!allowed || !allowed[input.action]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot ${input.action} a ${booking.status} booking`,
        });
      }

      const newStatus = allowed[input.action] as "DRAFT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

      const updated = await ctx.db.crmBooking.update({
        where: { id: input.id },
        data: { status: newStatus },
      });

      await recalcCustomerLifetimeValue(ctx.db, booking.customerId);

      return updated;
    }),
});
