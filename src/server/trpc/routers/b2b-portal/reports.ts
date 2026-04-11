import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("b2b-portal");

export const reportsRouter = createTRPCRouter({
  bookingSummary: proc
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = {
        companyId: ctx.companyId,
        source: "TOUR_OPERATOR",
      };
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.dateFrom || input.dateTo) {
        where.checkIn = {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {}),
        };
      }

      const bookings = await ctx.db.booking.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
        _sum: { sellingTotal: true, buyingTotal: true, markupAmount: true },
      });

      const totalBookings = await ctx.db.booking.count({ where });

      return {
        totalBookings,
        byStatus: bookings.map((b) => ({
          status: b.status,
          count: b._count.id,
          sellingTotal: b._sum.sellingTotal ? Number(b._sum.sellingTotal) : 0,
          buyingTotal: b._sum.buyingTotal ? Number(b._sum.buyingTotal) : 0,
          markupAmount: b._sum.markupAmount ? Number(b._sum.markupAmount) : 0,
        })),
      };
    }),

  revenueSummary: proc
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        groupBy: z.enum(["month", "week", "day"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = {
        companyId: ctx.companyId,
        source: "TOUR_OPERATOR",
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
      };
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.dateFrom || input.dateTo) {
        where.checkIn = {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {}),
        };
      }

      const bookings = await ctx.db.booking.findMany({
        where,
        select: {
          id: true,
          checkIn: true,
          tourOperatorId: true,
          sellingTotal: true,
          buyingTotal: true,
          markupAmount: true,
        },
      });

      const toIds = [...new Set(bookings.map((b) => b.tourOperatorId).filter((id): id is string => !!id))];
      const tos = await ctx.db.tourOperator.findMany({
        where: { id: { in: toIds } },
        select: { id: true, name: true, code: true },
      });
      const toMap = new Map(tos.map((t) => [t.id, t]));

      function periodKey(date: Date): string {
        if (input.groupBy === "day") return date.toISOString().slice(0, 10);
        if (input.groupBy === "week") {
          const d = new Date(date);
          d.setDate(d.getDate() - d.getDay());
          return d.toISOString().slice(0, 10);
        }
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      const periodMap = new Map<string, { bookingCount: number; sellingTotal: number; buyingTotal: number; markup: number }>();
      for (const b of bookings) {
        const key = periodKey(new Date(b.checkIn));
        const entry = periodMap.get(key) ?? { bookingCount: 0, sellingTotal: 0, buyingTotal: 0, markup: 0 };
        entry.bookingCount += 1;
        entry.sellingTotal += Number(b.sellingTotal ?? 0);
        entry.buyingTotal += Number(b.buyingTotal ?? 0);
        entry.markup += Number(b.markupAmount ?? 0);
        periodMap.set(key, entry);
      }

      const timeSeries = [...periodMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, vals]) => ({ period, ...vals }));

      const operatorMap = new Map<string, { bookingCount: number; sellingTotal: number; buyingTotal: number; markup: number }>();
      for (const b of bookings) {
        const key = b.tourOperatorId ?? "_none";
        const entry = operatorMap.get(key) ?? { bookingCount: 0, sellingTotal: 0, buyingTotal: 0, markup: 0 };
        entry.bookingCount += 1;
        entry.sellingTotal += Number(b.sellingTotal ?? 0);
        entry.buyingTotal += Number(b.buyingTotal ?? 0);
        entry.markup += Number(b.markupAmount ?? 0);
        operatorMap.set(key, entry);
      }

      const byOperator = [...operatorMap.entries()].map(([toId, vals]) => ({
        tourOperatorId: toId === "_none" ? null : toId,
        tourOperator: toId !== "_none" ? toMap.get(toId) ?? null : null,
        ...vals,
      }));

      return { timeSeries, byOperator };
    }),

  statement: proc
    .input(
      z.object({
        tourOperatorId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const to = await ctx.db.tourOperator.findFirst({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
        select: { id: true, name: true, code: true, creditLimit: true, creditUsed: true },
      });
      if (!to)
        throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });

      const openingTx = await ctx.db.b2bCreditTransaction.aggregate({
        where: {
          companyId: ctx.companyId,
          tourOperatorId: input.tourOperatorId,
          createdAt: { lt: input.dateFrom },
        },
        _sum: { amount: true },
      });
      const openingBalance = openingTx._sum.amount ? Number(openingTx._sum.amount) : 0;

      const transactions = await ctx.db.b2bCreditTransaction.findMany({
        where: {
          companyId: ctx.companyId,
          tourOperatorId: input.tourOperatorId,
          createdAt: { gte: input.dateFrom, lte: input.dateTo },
        },
        include: {
          booking: { select: { id: true, code: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const periodSum = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      const closingBalance = openingBalance + periodSum;

      return {
        tourOperator: to,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        openingBalance,
        transactions,
        closingBalance,
        currentCreditUsed: Number(to.creditUsed),
        currentCreditLimit: Number(to.creditLimit),
      };
    }),
});
