import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

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
        where: { companyId: ctx.session.user.companyId, ...(input.state ? { state: input.state as any } : {}) },
        include: {
          account: { select: { id: true, code: true, name: true } },
          revenueAccount: { select: { id: true, code: true, name: true } },
        },
        orderBy: { startDate: "desc" },
      });
    }),

  getById: p("finance:deferred:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rec = await (ctx.db.deferredRevenue as any).findFirst({
        where: { id: input.id, companyId: ctx.session.user.companyId },
        include: {
          account: { select: { id: true, code: true, name: true } },
          revenueAccount: { select: { id: true, code: true, name: true } },
          schedule: { orderBy: { date: "asc" } },
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
          companyId: ctx.session.user.companyId,
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

  recognize: p("finance:deferred:update")
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const line = await ctx.db.deferredRevenueSchedule.findFirst({ where: { id: input.scheduleId } });
      if (!line) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.deferredRevenueSchedule.update({ where: { id: input.scheduleId }, data: { isRecognized: true } });
      const deferred = await ctx.db.deferredRevenue.findFirst({ where: { id: line.deferredId } });
      if (deferred) {
        await ctx.db.deferredRevenue.update({
          where: { id: line.deferredId },
          data: { recognizedAmount: new Decimal(deferred.recognizedAmount.toString()).plus(new Decimal(line.amount.toString())) },
        });
      }
    }),

  close: p("finance:deferred:confirm")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deferredRevenue.update({
        where: { id: input.id, companyId: ctx.session.user.companyId },
        data: { state: "CLOSED" },
      });
    }),
});
