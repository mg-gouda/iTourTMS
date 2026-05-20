import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

function buildLoanSchedule(amount: Decimal, annualRate: Decimal, termMonths: number, startDate: Date) {
  const monthlyRate = annualRate.div(12).div(100);
  const lines = [];
  let balance = amount;

  const pmt = monthlyRate.eq(0)
    ? amount.div(termMonths)
    : amount.times(monthlyRate).div(new Decimal(1).minus(new Decimal(1).plus(monthlyRate).pow(-termMonths)));

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const interest = balance.times(monthlyRate);
    const principal = pmt.minus(interest);
    balance = balance.minus(principal);
    lines.push({
      sequence: i,
      dueDate,
      principal: principal.toDecimalPlaces(4),
      interest: interest.toDecimalPlaces(4),
      total: pmt.toDecimalPlaces(4),
      balance: balance.lt(0) ? new Decimal(0) : balance.toDecimalPlaces(4),
    });
  }
  return lines;
}

export const loanRouter = createTRPCRouter({
  list: p("finance:asset:read")
    .input(z.object({ state: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(), loanType: z.enum(["RECEIVED", "GIVEN"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.accountLoan.findMany({
        where: { companyId: ctx.session.user.companyId, ...input },
        include: {
          account: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, name: true } },
          _count: { select: { schedule: true } },
        },
        orderBy: { startDate: "desc" },
      });
    }),

  getById: p("finance:asset:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const loan = await ctx.db.accountLoan.findFirst({
        where: { id: input.id, companyId: ctx.session.user.companyId },
        include: {
          account: { select: { id: true, code: true, name: true } },
          interestAccount: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, name: true } },
          schedule: { orderBy: { sequence: "asc" } },
        },
      });
      if (!loan) throw new TRPCError({ code: "NOT_FOUND" });
      return loan;
    }),

  create: p("finance:asset:create")
    .input(z.object({
      name: z.string().min(1),
      loanType: z.enum(["RECEIVED", "GIVEN"]).default("RECEIVED"),
      partnerId: z.string().optional(),
      amount: z.number().positive(),
      rate: z.number().min(0),
      termMonths: z.number().int().min(1),
      startDate: z.string(),
      accountId: z.string(),
      interestAccountId: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { startDate, amount, rate, ...rest } = input;
      const loan = await ctx.db.accountLoan.create({
        data: {
          ...rest,
          companyId: ctx.session.user.companyId,
          startDate: new Date(startDate),
          amount: new Decimal(amount),
          rate: new Decimal(rate),
          outstanding: new Decimal(amount),
        },
      });

      const schedule = buildLoanSchedule(new Decimal(amount), new Decimal(rate), input.termMonths, new Date(startDate));
      await ctx.db.loanScheduleLine.createMany({
        data: schedule.map((l) => ({ ...l, loanId: loan.id })),
      });
      return ctx.db.accountLoan.update({ where: { id: loan.id }, data: { state: "OPEN" } });
    }),

  markPaid: p("finance:asset:confirm")
    .input(z.object({ lineId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.loanScheduleLine.update({ where: { id: input.lineId }, data: { isPaid: true } });
    }),

  close: p("finance:asset:confirm")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accountLoan.update({
        where: { id: input.id, companyId: ctx.session.user.companyId },
        data: { state: "CLOSED", outstanding: new Decimal(0) },
      });
    }),
});
