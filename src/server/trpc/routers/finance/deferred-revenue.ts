import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { postingJournal, postTwoLineEntry } from "@/server/services/finance/simple-entry";
import { activeBranch } from "@/server/branch-scope";

const p = (code: string) => modulePermissionProcedure("finance", code);

/**
 * Revenue recognition schedule lines as real entries in the deferral's branch's books:
 * Dr accountId / Cr revenueAccountId. `only` posts that one line; otherwise every line
 * due by today.
 */
async function postLines(ctx: { db: PrismaClient; companyId: string }, deferredId: string, only?: string) {
  const deferred = await ctx.db.deferredRevenue.findFirst({
    where: { id: deferredId, companyId: ctx.companyId },
    include: { schedule: { where: { isRecognized: false }, orderBy: { date: "asc" } } },
  });
  if (!deferred) throw new TRPCError({ code: "NOT_FOUND" });
  const lines = deferred.schedule.filter((l) => (only ? l.id === only : l.date <= new Date()));
  if (!lines.length) return { posted: 0 };

  const journalId = await postingJournal(ctx.db, ctx.companyId, deferred.branchId, deferred.journalId);
  return ctx.db.$transaction(async (tx) => {
    let total = new Decimal(0);
    for (const line of lines) {
      const move = await postTwoLineEntry(tx, {
        companyId: ctx.companyId,
        branchId: deferred.branchId,
        journalId,
        date: line.date,
        ref: `Revenue recognition: ${deferred.name}`,
        debitAccountId: deferred.accountId,
        creditAccountId: deferred.revenueAccountId,
        amount: new Decimal(line.amount.toString()),
      });
      await tx.deferredRevenueSchedule.update({ where: { id: line.id }, data: { isRecognized: true, moveId: move.id } });
      total = total.plus(line.amount.toString());
    }
    await tx.deferredRevenue.update({
      where: { id: deferred.id },
      data: {
        recognizedAmount: new Decimal(deferred.recognizedAmount.toString()).plus(total),
        ...(lines.length === deferred.schedule.length && { state: "CLOSED" as const }),
      },
    });
    return { posted: lines.length };
  });
}

function buildMonthlySchedule(amount: Decimal, startDate: Date, endDate: Date) {
  const lines: { date: Date; amount: Decimal }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const monthlyAmount = amount.div(months).toDecimalPlaces(4);
  let remaining = amount;
  for (let i = 0; i < months; i++) {
    const date = new Date(start);
    date.setMonth(date.getMonth() + i);
    const isLast = i === months - 1;
    const lineAmount = isLast ? remaining : monthlyAmount;
    remaining = remaining.minus(lineAmount);
    lines.push({ date, amount: lineAmount });
  }
  return lines;
}

export const deferredRevenueRouter = createTRPCRouter({
  list: p("finance:deferred:read")
    .input(z.object({ state: z.enum(["DRAFT", "RUNNING", "CLOSED"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.deferredRevenue.findMany({
        where: { companyId: ctx.companyId, ...(input.state ? { state: input.state as any } : {}) },
        include: {
          branch: { select: { code: true, name: true } },
          account: { select: { id: true, code: true, name: true } },
          revenueAccount: { select: { id: true, code: true, name: true } },
        },
        orderBy: { startDate: "desc" },
      });
    }),

  getById: p("finance:deferred:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rec = await ctx.db.deferredRevenue.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          account: { select: { id: true, code: true, name: true } },
          revenueAccount: { select: { id: true, code: true, name: true } },
          branch: { select: { code: true, name: true } },
          schedule: {
            orderBy: { date: "asc" },
            include: { move: { select: { id: true, name: true } } },
          },
        },
      });
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });
      return rec;
    }),

  create: p("finance:deferred:create")
    .input(z.object({
      name: z.string().min(1),
      amount: z.number().positive(),
      startDate: z.string(),
      endDate: z.string(),
      accountId: z.string(),
      revenueAccountId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { startDate, endDate, amount, ...rest } = input;
      const amountDec = new Decimal(amount);
      const start = new Date(startDate);
      const end = new Date(endDate);

      const rec = await ctx.db.deferredRevenue.create({
        data: {
          ...rest,
          companyId: ctx.companyId,
          branchId: activeBranch(ctx.branch),
          amount: amountDec,
          startDate: start,
          endDate: end,
          state: "RUNNING",
        },
      });

      const schedule = buildMonthlySchedule(amountDec, start, end);
      await ctx.db.deferredRevenueSchedule.createMany({
        data: schedule.map((l) => ({ deferredId: rec.id, date: l.date, amount: l.amount })),
      });
      return rec;
    }),

  /** Posts one schedule line now, whatever its date. */
  recognize: p("finance:deferred:update")
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const line = await ctx.db.deferredRevenueSchedule.findFirst({ where: { id: input.scheduleId } });
      if (!line) throw new TRPCError({ code: "NOT_FOUND" });
      return postLines(ctx, line.deferredId, line.id);
    }),

  /** Posts every schedule line due by today. */
  postDue: p("finance:deferred:update")
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => postLines(ctx, input.id)),

  close: p("finance:deferred:confirm")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deferredRevenue.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { state: "CLOSED" },
      });
    }),
});
