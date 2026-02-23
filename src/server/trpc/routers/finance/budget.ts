import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import {
  budgetCreateSchema,
  budgetUpdateSchema,
} from "@/lib/validations/finance";
import {
  REPORT_INCOME_TYPES,
  REPORT_EXPENSE_TYPES,
  BUDGET_AMOUNT_KEYS,
} from "@/lib/constants/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const budgetRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z
        .object({
          state: z.enum(["DRAFT", "APPROVED", "CANCELLED"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.budget.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.state && { state: input.state }),
        },
        include: {
          fiscalYear: { select: { id: true, name: true, dateFrom: true, dateTo: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          fiscalYear: { select: { id: true, name: true, dateFrom: true, dateTo: true } },
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, accountType: true } },
            },
            orderBy: { account: { code: "asc" } },
          },
        },
      });
      if (!budget)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      return budget;
    }),

  create: financeProcedure
    .input(budgetCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.budget.create({
        data: {
          companyId: ctx.companyId,
          name: input.name,
          fiscalYearId: input.fiscalYearId,
          state: "DRAFT",
          lines: {
            create: input.lines.map((l) => ({
              accountId: l.accountId,
              amount01: l.amount01,
              amount02: l.amount02,
              amount03: l.amount03,
              amount04: l.amount04,
              amount05: l.amount05,
              amount06: l.amount06,
              amount07: l.amount07,
              amount08: l.amount08,
              amount09: l.amount09,
              amount10: l.amount10,
              amount11: l.amount11,
              amount12: l.amount12,
              annualAmount: new Decimal(l.amount01)
                .plus(l.amount02)
                .plus(l.amount03)
                .plus(l.amount04)
                .plus(l.amount05)
                .plus(l.amount06)
                .plus(l.amount07)
                .plus(l.amount08)
                .plus(l.amount09)
                .plus(l.amount10)
                .plus(l.amount11)
                .plus(l.amount12),
            })),
          },
        },
        include: { lines: true },
      });
    }),

  update: financeProcedure
    .input(budgetUpdateSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, lines, ...data } = input;
      const existing = await ctx.db.budget.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      if (existing.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft budgets can be updated",
        });
      }

      if (lines) {
        return ctx.db.$transaction(async (tx) => {
          await tx.budgetLine.deleteMany({
            where: { budgetId: id },
          });
          return tx.budget.update({
            where: { id },
            data: {
              ...data,
              lines: {
                create: lines.map((l) => ({
                  accountId: l.accountId,
                  amount01: l.amount01,
                  amount02: l.amount02,
                  amount03: l.amount03,
                  amount04: l.amount04,
                  amount05: l.amount05,
                  amount06: l.amount06,
                  amount07: l.amount07,
                  amount08: l.amount08,
                  amount09: l.amount09,
                  amount10: l.amount10,
                  amount11: l.amount11,
                  amount12: l.amount12,
                  annualAmount: new Decimal(l.amount01)
                    .plus(l.amount02)
                    .plus(l.amount03)
                    .plus(l.amount04)
                    .plus(l.amount05)
                    .plus(l.amount06)
                    .plus(l.amount07)
                    .plus(l.amount08)
                    .plus(l.amount09)
                    .plus(l.amount10)
                    .plus(l.amount11)
                    .plus(l.amount12),
                })),
              },
            },
          });
        });
      }

      return ctx.db.budget.update({
        where: { id },
        data,
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.budget.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Budget not found",
        });
      if (existing.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft budgets can be deleted",
        });
      }
      return ctx.db.budget.delete({ where: { id: input.id } });
    }),

  approve: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!budget)
        throw new TRPCError({ code: "NOT_FOUND" });
      if (budget.state !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft budgets can be approved",
        });
      }
      return ctx.db.budget.update({
        where: { id: input.id },
        data: { state: "APPROVED" },
      });
    }),

  cancel: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!budget)
        throw new TRPCError({ code: "NOT_FOUND" });
      if (budget.state === "CANCELLED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Budget is already cancelled",
        });
      }
      return ctx.db.budget.update({
        where: { id: input.id },
        data: { state: "CANCELLED" },
      });
    }),

  resetToDraft: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!budget)
        throw new TRPCError({ code: "NOT_FOUND" });
      if (budget.state !== "CANCELLED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only cancelled budgets can be reset to draft",
        });
      }
      return ctx.db.budget.update({
        where: { id: input.id },
        data: { state: "DRAFT" },
      });
    }),

  budgetVsActuals: financeProcedure
    .input(z.object({ budgetId: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.budgetId, companyId: ctx.companyId },
        include: {
          fiscalYear: { select: { name: true, dateFrom: true, dateTo: true } },
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, accountType: true } },
            },
          },
        },
      });

      if (!budget)
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });

      const fyStart = new Date(budget.fiscalYear.dateFrom);
      const fyEnd = new Date(budget.fiscalYear.dateTo);

      // Get all POSTED line items for budgeted accounts within FY
      const accountIds = budget.lines.map((l) => l.accountId);
      if (accountIds.length === 0) {
        return {
          budgetName: budget.name,
          fiscalYearName: budget.fiscalYear.name,
          accounts: [],
          totals: {
            planned: Array(12).fill(0) as number[],
            actual: Array(12).fill(0) as number[],
            variance: Array(12).fill(0) as number[],
            plannedTotal: 0,
            actualTotal: 0,
            varianceTotal: 0,
          },
        };
      }

      const lineItems = await ctx.db.moveLineItem.findMany({
        where: {
          accountId: { in: accountIds },
          move: {
            companyId: ctx.companyId,
            state: "POSTED",
            date: { gte: fyStart, lte: fyEnd },
          },
        },
        select: {
          accountId: true,
          debit: true,
          credit: true,
          move: { select: { date: true } },
          account: { select: { accountType: true } },
        },
      });

      // Aggregate actuals by account and month (0-indexed month within FY)
      const actualsByAccountMonth = new Map<string, Map<number, Decimal>>();
      for (const item of lineItems) {
        const date = new Date(item.move.date);
        const month = date.getMonth(); // 0-based
        const debit = new Decimal(item.debit.toString());
        const credit = new Decimal(item.credit.toString());

        const isIncome = (REPORT_INCOME_TYPES as readonly string[]).includes(
          item.account.accountType,
        );

        // Income: actual = credit - debit; Expense: actual = debit - credit
        const amount = isIncome ? credit.minus(debit) : debit.minus(credit);

        if (!actualsByAccountMonth.has(item.accountId)) {
          actualsByAccountMonth.set(item.accountId, new Map());
        }
        const monthMap = actualsByAccountMonth.get(item.accountId)!;
        const existing = monthMap.get(month) ?? new Decimal(0);
        monthMap.set(month, existing.plus(amount));
      }

      // Build per-account result
      const totalPlanned = Array(12).fill(null).map(() => new Decimal(0));
      const totalActual = Array(12).fill(null).map(() => new Decimal(0));

      const accounts = budget.lines
        .map((line) => {
          const planned: number[] = BUDGET_AMOUNT_KEYS.map((key) => {
            const val = (line as any)[key];
            return new Decimal(val?.toString() ?? "0").toNumber();
          });

          const monthActuals = actualsByAccountMonth.get(line.accountId);
          // Map FY months to budget amount columns
          // FY starts at fyStart.getMonth(), budget amounts go 01-12
          const fyStartMonth = fyStart.getMonth();
          const actual: number[] = Array(12).fill(0);
          for (let i = 0; i < 12; i++) {
            const calMonth = (fyStartMonth + i) % 12;
            const val = monthActuals?.get(calMonth) ?? new Decimal(0);
            actual[i] = val.toNumber();
          }

          const variance = planned.map((p, i) => p - actual[i]);
          const plannedTotal = planned.reduce((s, v) => s + v, 0);
          const actualTotal = actual.reduce((s, v) => s + v, 0);

          // Accumulate totals
          for (let i = 0; i < 12; i++) {
            totalPlanned[i] = totalPlanned[i].plus(planned[i]);
            totalActual[i] = totalActual[i].plus(actual[i]);
          }

          return {
            accountId: line.account.id,
            accountCode: line.account.code,
            accountName: line.account.name,
            accountType: line.account.accountType,
            planned,
            actual,
            variance,
            plannedTotal,
            actualTotal,
            varianceTotal: plannedTotal - actualTotal,
          };
        })
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      return {
        budgetName: budget.name,
        fiscalYearName: budget.fiscalYear.name,
        accounts,
        totals: {
          planned: totalPlanned.map((d) => d.toNumber()),
          actual: totalActual.map((d) => d.toNumber()),
          variance: totalPlanned.map((d, i) =>
            d.minus(totalActual[i]).toNumber(),
          ),
          plannedTotal: totalPlanned.reduce((s, d) => s.plus(d), new Decimal(0)).toNumber(),
          actualTotal: totalActual.reduce((s, d) => s.plus(d), new Decimal(0)).toNumber(),
          varianceTotal: totalPlanned
            .reduce((s, d) => s.plus(d), new Decimal(0))
            .minus(totalActual.reduce((s, d) => s.plus(d), new Decimal(0)))
            .toNumber(),
        },
      };
    }),
});
