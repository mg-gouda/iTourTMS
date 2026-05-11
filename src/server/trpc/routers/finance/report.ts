import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";

import {
  REPORT_INCOME_TYPES,
  REPORT_EXPENSE_TYPES,
  REPORT_ASSET_TYPES,
  REPORT_LIABILITY_TYPES,
  REPORT_EQUITY_TYPES,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/constants/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

/** Convert Prisma Decimal to number */
function d(val: any): number {
  if (val === null || val === undefined) return 0;
  return new Decimal(val.toString()).toNumber();
}

/** Compute days between two dates */
function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Fetch company's base currency info */
async function getBaseCurrency(db: any, companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { baseCurrency: { select: { code: true, symbol: true } } },
  });
  return { code: company?.baseCurrency?.code ?? "", symbol: company?.baseCurrency?.symbol ?? "" };
}

export const reportRouter = createTRPCRouter({
  // ── Dashboard KPIs ──
  dashboard: financeProcedure.query(async ({ ctx }) => {
    const companyId = ctx.companyId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      receivableResult,
      payableResult,
      bankBalanceResult,
      revenueMonthResult,
      overdueInvoices,
      paymentStatusResult,
      revenueTrendData,
    ] = await Promise.all([
      // Total Receivable
      ctx.db.move.aggregate({
        where: {
          companyId,
          state: "POSTED",
          moveType: { in: ["OUT_INVOICE", "OUT_REFUND"] },
          paymentState: { in: ["NOT_PAID", "PARTIAL", "IN_PAYMENT"] },
        },
        _sum: { amountResidual: true },
      }),

      // Total Payable
      ctx.db.move.aggregate({
        where: {
          companyId,
          state: "POSTED",
          moveType: { in: ["IN_INVOICE", "IN_REFUND"] },
          paymentState: { in: ["NOT_PAID", "PARTIAL", "IN_PAYMENT"] },
        },
        _sum: { amountResidual: true },
      }),

      // Bank Balance — sum debit-credit on ASSET_CASH accounts
      ctx.db.moveLineItem.aggregate({
        where: {
          move: { companyId, state: "POSTED" },
          account: { accountType: "ASSET_CASH" },
        },
        _sum: { debit: true, credit: true },
      }),

      // Revenue This Month
      ctx.db.moveLineItem.aggregate({
        where: {
          move: { companyId, state: "POSTED", date: { gte: monthStart, lte: now } },
          account: { accountType: { in: [...REPORT_INCOME_TYPES] } },
        },
        _sum: { debit: true, credit: true },
      }),

      // Top 5 Overdue Invoices
      ctx.db.move.findMany({
        where: {
          companyId,
          state: "POSTED",
          moveType: "OUT_INVOICE",
          paymentState: { in: ["NOT_PAID", "PARTIAL"] },
          invoiceDateDue: { lt: now },
        },
        include: {
          partner: { select: { id: true, name: true } },
        },
        orderBy: { amountResidual: "desc" },
        take: 5,
      }),

      // Payment Status Breakdown
      ctx.db.move.groupBy({
        by: ["paymentState"],
        where: {
          companyId,
          state: "POSTED",
          moveType: { in: ["OUT_INVOICE", "IN_INVOICE"] },
        },
        _count: { id: true },
        _sum: { amountTotal: true },
      }),

      // Revenue Trend (last 12 months) — fetch all income line items and group in memory
      ctx.db.moveLineItem.findMany({
        where: {
          move: {
            companyId,
            state: "POSTED",
            date: {
              gte: new Date(now.getFullYear() - 1, now.getMonth(), 1),
              lte: now,
            },
          },
          account: { accountType: { in: [...REPORT_INCOME_TYPES] } },
        },
        select: {
          credit: true,
          debit: true,
          move: { select: { date: true } },
        },
      }),
    ]);

    // Process revenue trend
    const monthlyRevenue = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue.set(key, 0);
    }
    for (const item of revenueTrendData) {
      const date = new Date(item.move.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyRevenue.has(key)) {
        const credit = new Decimal(item.credit?.toString() ?? "0");
        const debit = new Decimal(item.debit?.toString() ?? "0");
        monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + credit.minus(debit).toNumber());
      }
    }

    const revenueTrend = Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    const bankDebit = d(bankBalanceResult._sum.debit);
    const bankCredit = d(bankBalanceResult._sum.credit);
    const revenueDebit = d(revenueMonthResult._sum.debit);
    const revenueCredit = d(revenueMonthResult._sum.credit);

    const baseCurrency = await getBaseCurrency(ctx.db, companyId);

    return {
      baseCurrency,
      totalReceivable: d(receivableResult._sum.amountResidual),
      totalPayable: d(payableResult._sum.amountResidual),
      bankBalance: bankDebit - bankCredit,
      revenueThisMonth: revenueCredit - revenueDebit,
      revenueTrend,
      topOverdueInvoices: overdueInvoices.map((inv) => ({
        id: inv.id,
        name: inv.name,
        partnerName: inv.partner?.name ?? null,
        amountTotal: d(inv.amountTotal),
        amountResidual: d(inv.amountResidual),
        invoiceDateDue: inv.invoiceDateDue?.toISOString() ?? inv.date.toISOString(),
        daysOverdue: daysBetween(inv.invoiceDateDue ?? inv.date, now),
      })),
      paymentStatusBreakdown: paymentStatusResult.map((row) => ({
        paymentState: row.paymentState,
        count: row._count.id,
        total: d(row._sum.amountTotal),
      })),
    };
  }),

  // ── Profit & Loss ──
  profitAndLoss: financeProcedure
    .input(z.object({ dateFrom: z.coerce.date(), dateTo: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const lines = await ctx.db.moveLineItem.findMany({
        where: {
          move: {
            companyId: ctx.companyId,
            state: "POSTED",
            date: { gte: input.dateFrom, lte: input.dateTo },
          },
          account: {
            accountType: { in: [...REPORT_INCOME_TYPES, ...REPORT_EXPENSE_TYPES] },
          },
        },
        select: {
          debit: true,
          credit: true,
          accountId: true,
          account: { select: { id: true, code: true, name: true, accountType: true } },
        },
      });

      // Aggregate by account
      const accountBalances = new Map<string, {
        accountId: string;
        code: string;
        name: string;
        accountType: string;
        totalDebit: Decimal;
        totalCredit: Decimal;
      }>();

      for (const line of lines) {
        const existing = accountBalances.get(line.accountId);
        if (existing) {
          existing.totalDebit = existing.totalDebit.plus(new Decimal(line.debit.toString()));
          existing.totalCredit = existing.totalCredit.plus(new Decimal(line.credit.toString()));
        } else {
          accountBalances.set(line.accountId, {
            accountId: line.account.id,
            code: line.account.code,
            name: line.account.name,
            accountType: line.account.accountType,
            totalDebit: new Decimal(line.debit.toString()),
            totalCredit: new Decimal(line.credit.toString()),
          });
        }
      }

      const incomeAccounts: Array<{ accountId: string; code: string; name: string; accountType: string; balance: number }> = [];
      const expenseAccounts: Array<{ accountId: string; code: string; name: string; accountType: string; balance: number }> = [];

      let totalIncome = new Decimal(0);
      let totalExpenses = new Decimal(0);

      for (const acc of accountBalances.values()) {
        if ((REPORT_INCOME_TYPES as readonly string[]).includes(acc.accountType)) {
          // Income: balance = credit - debit
          const balance = acc.totalCredit.minus(acc.totalDebit);
          incomeAccounts.push({
            accountId: acc.accountId,
            code: acc.code,
            name: acc.name,
            accountType: acc.accountType,
            balance: balance.toNumber(),
          });
          totalIncome = totalIncome.plus(balance);
        } else {
          // Expense: balance = debit - credit
          const balance = acc.totalDebit.minus(acc.totalCredit);
          expenseAccounts.push({
            accountId: acc.accountId,
            code: acc.code,
            name: acc.name,
            accountType: acc.accountType,
            balance: balance.toNumber(),
          });
          totalExpenses = totalExpenses.plus(balance);
        }
      }

      incomeAccounts.sort((a, b) => a.code.localeCompare(b.code));
      expenseAccounts.sort((a, b) => a.code.localeCompare(b.code));

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return {
        baseCurrency,
        dateFrom: input.dateFrom.toISOString(),
        dateTo: input.dateTo.toISOString(),
        incomeAccounts,
        expenseAccounts,
        totalIncome: totalIncome.toNumber(),
        totalExpenses: totalExpenses.toNumber(),
        netProfit: totalIncome.minus(totalExpenses).toNumber(),
      };
    }),

  // ── Balance Sheet ──
  balanceSheet: financeProcedure
    .input(z.object({ asOfDate: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const allTypes = [
        ...REPORT_ASSET_TYPES,
        ...REPORT_LIABILITY_TYPES,
        ...REPORT_EQUITY_TYPES,
      ];

      // Fetch all line items up to as-of date for balance sheet accounts
      const lines = await ctx.db.moveLineItem.findMany({
        where: {
          move: {
            companyId: ctx.companyId,
            state: "POSTED",
            date: { lte: input.asOfDate },
          },
          account: { accountType: { in: [...allTypes] } },
        },
        select: {
          debit: true,
          credit: true,
          accountId: true,
          account: { select: { id: true, code: true, name: true, accountType: true } },
        },
      });

      // Also compute retained earnings (net P&L for the year)
      const yearStart = new Date(input.asOfDate.getFullYear(), 0, 1);
      const plLines = await ctx.db.moveLineItem.findMany({
        where: {
          move: {
            companyId: ctx.companyId,
            state: "POSTED",
            date: { gte: yearStart, lte: input.asOfDate },
          },
          account: {
            accountType: { in: [...REPORT_INCOME_TYPES, ...REPORT_EXPENSE_TYPES] },
          },
        },
        select: { debit: true, credit: true, account: { select: { accountType: true } } },
      });

      let retainedEarnings = new Decimal(0);
      for (const line of plLines) {
        const debit = new Decimal(line.debit.toString());
        const credit = new Decimal(line.credit.toString());
        if ((REPORT_INCOME_TYPES as readonly string[]).includes(line.account.accountType)) {
          retainedEarnings = retainedEarnings.plus(credit.minus(debit));
        } else {
          retainedEarnings = retainedEarnings.minus(debit.minus(credit));
        }
      }

      // Aggregate by account
      const accountBalances = new Map<string, {
        accountId: string;
        code: string;
        name: string;
        accountType: string;
        totalDebit: Decimal;
        totalCredit: Decimal;
      }>();

      for (const line of lines) {
        const existing = accountBalances.get(line.accountId);
        if (existing) {
          existing.totalDebit = existing.totalDebit.plus(new Decimal(line.debit.toString()));
          existing.totalCredit = existing.totalCredit.plus(new Decimal(line.credit.toString()));
        } else {
          accountBalances.set(line.accountId, {
            accountId: line.account.id,
            code: line.account.code,
            name: line.account.name,
            accountType: line.account.accountType,
            totalDebit: new Decimal(line.debit.toString()),
            totalCredit: new Decimal(line.credit.toString()),
          });
        }
      }

      type SectionGroup = {
        accountType: string;
        accountTypeLabel: string;
        accounts: Array<{ accountId: string; code: string; name: string; balance: number }>;
        subtotal: number;
      };

      function buildSection(types: readonly string[], isDebitNormal: boolean): SectionGroup[] {
        const groups: SectionGroup[] = [];
        for (const type of types) {
          const accounts: Array<{ accountId: string; code: string; name: string; balance: number }> = [];
          let subtotal = new Decimal(0);

          for (const acc of accountBalances.values()) {
            if (acc.accountType !== type) continue;
            const balance = isDebitNormal
              ? acc.totalDebit.minus(acc.totalCredit)
              : acc.totalCredit.minus(acc.totalDebit);
            if (balance.abs().greaterThan(0.001)) {
              accounts.push({
                accountId: acc.accountId,
                code: acc.code,
                name: acc.name,
                balance: balance.toNumber(),
              });
              subtotal = subtotal.plus(balance);
            }
          }

          if (accounts.length > 0) {
            accounts.sort((a, b) => a.code.localeCompare(b.code));
            groups.push({
              accountType: type,
              accountTypeLabel: ACCOUNT_TYPE_LABELS[type] ?? type,
              accounts,
              subtotal: subtotal.toNumber(),
            });
          }
        }
        return groups;
      }

      const assets = buildSection(REPORT_ASSET_TYPES, true);
      const liabilities = buildSection(REPORT_LIABILITY_TYPES, false);
      const equity = buildSection(REPORT_EQUITY_TYPES, false);

      // Add retained earnings to equity
      if (retainedEarnings.abs().greaterThan(0.001)) {
        const existingUnaffected = equity.find((g) => g.accountType === "EQUITY_UNAFFECTED");
        if (existingUnaffected) {
          existingUnaffected.accounts.push({
            accountId: "__retained_earnings__",
            code: "—",
            name: "Current Year Earnings (P&L)",
            balance: retainedEarnings.toNumber(),
          });
          existingUnaffected.subtotal += retainedEarnings.toNumber();
        } else {
          equity.push({
            accountType: "EQUITY_UNAFFECTED",
            accountTypeLabel: "Current Year Earnings",
            accounts: [{
              accountId: "__retained_earnings__",
              code: "—",
              name: "Current Year Earnings (P&L)",
              balance: retainedEarnings.toNumber(),
            }],
            subtotal: retainedEarnings.toNumber(),
          });
        }
      }

      const totalAssets = assets.reduce((s, g) => s + g.subtotal, 0);
      const totalLiabilities = liabilities.reduce((s, g) => s + g.subtotal, 0);
      const totalEquity = equity.reduce((s, g) => s + g.subtotal, 0);

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return {
        baseCurrency,
        asOfDate: input.asOfDate.toISOString(),
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
      };
    }),

  // ── Trial Balance ──
  trialBalance: financeProcedure
    .input(z.object({ dateFrom: z.coerce.date(), dateTo: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      // Fetch all accounts
      const accounts = await ctx.db.finAccount.findMany({
        where: { companyId: ctx.companyId, deprecated: false },
        select: { id: true, code: true, name: true, accountType: true },
        orderBy: { code: "asc" },
      });

      // Fetch opening balances (before dateFrom) and period movement in parallel
      const [openingLines, periodLines] = await Promise.all([
        ctx.db.moveLineItem.findMany({
          where: {
            move: { companyId: ctx.companyId, state: "POSTED", date: { lt: input.dateFrom } },
          },
          select: { accountId: true, debit: true, credit: true },
        }),
        ctx.db.moveLineItem.findMany({
          where: {
            move: {
              companyId: ctx.companyId,
              state: "POSTED",
              date: { gte: input.dateFrom, lte: input.dateTo },
            },
          },
          select: { accountId: true, debit: true, credit: true },
        }),
      ]);

      // Aggregate opening
      const openingMap = new Map<string, { debit: Decimal; credit: Decimal }>();
      for (const line of openingLines) {
        const existing = openingMap.get(line.accountId);
        if (existing) {
          existing.debit = existing.debit.plus(new Decimal(line.debit.toString()));
          existing.credit = existing.credit.plus(new Decimal(line.credit.toString()));
        } else {
          openingMap.set(line.accountId, {
            debit: new Decimal(line.debit.toString()),
            credit: new Decimal(line.credit.toString()),
          });
        }
      }

      // Aggregate period
      const periodMap = new Map<string, { debit: Decimal; credit: Decimal }>();
      for (const line of periodLines) {
        const existing = periodMap.get(line.accountId);
        if (existing) {
          existing.debit = existing.debit.plus(new Decimal(line.debit.toString()));
          existing.credit = existing.credit.plus(new Decimal(line.credit.toString()));
        } else {
          periodMap.set(line.accountId, {
            debit: new Decimal(line.debit.toString()),
            credit: new Decimal(line.credit.toString()),
          });
        }
      }

      const totals = {
        openingDebit: 0, openingCredit: 0,
        periodDebit: 0, periodCredit: 0,
        closingDebit: 0, closingCredit: 0,
      };

      const result = accounts
        .map((acc) => {
          const opening = openingMap.get(acc.id) ?? { debit: new Decimal(0), credit: new Decimal(0) };
          const period = periodMap.get(acc.id) ?? { debit: new Decimal(0), credit: new Decimal(0) };
          const closingDebit = opening.debit.plus(period.debit);
          const closingCredit = opening.credit.plus(period.credit);

          return {
            accountId: acc.id,
            code: acc.code,
            name: acc.name,
            accountType: acc.accountType,
            openingDebit: opening.debit.toNumber(),
            openingCredit: opening.credit.toNumber(),
            periodDebit: period.debit.toNumber(),
            periodCredit: period.credit.toNumber(),
            closingDebit: closingDebit.toNumber(),
            closingCredit: closingCredit.toNumber(),
          };
        })
        .filter((row) =>
          row.openingDebit > 0.001 || row.openingCredit > 0.001 ||
          row.periodDebit > 0.001 || row.periodCredit > 0.001,
        );

      for (const row of result) {
        totals.openingDebit += row.openingDebit;
        totals.openingCredit += row.openingCredit;
        totals.periodDebit += row.periodDebit;
        totals.periodCredit += row.periodCredit;
        totals.closingDebit += row.closingDebit;
        totals.closingCredit += row.closingCredit;
      }

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return {
        baseCurrency,
        dateFrom: input.dateFrom.toISOString(),
        dateTo: input.dateTo.toISOString(),
        accounts: result,
        totals,
      };
    }),

  // ── General Ledger ──
  generalLedger: financeProcedure
    .input(z.object({
      accountId: z.string(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.finAccount.findFirst({
        where: { id: input.accountId, companyId: ctx.companyId },
        select: { id: true, code: true, name: true, accountType: true },
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      // Opening balance: sum before dateFrom
      let openingBalance = new Decimal(0);
      if (input.dateFrom) {
        const openingResult = await ctx.db.moveLineItem.aggregate({
          where: {
            accountId: input.accountId,
            move: { companyId: ctx.companyId, state: "POSTED", date: { lt: input.dateFrom } },
          },
          _sum: { debit: true, credit: true },
        });
        openingBalance = new Decimal(openingResult._sum.debit?.toString() ?? "0")
          .minus(new Decimal(openingResult._sum.credit?.toString() ?? "0"));
      }

      // Line items in period
      const whereClause: any = {
        accountId: input.accountId,
        move: { companyId: ctx.companyId, state: "POSTED" },
      };

      if (input.dateFrom || input.dateTo) {
        whereClause.move.date = {};
        if (input.dateFrom) whereClause.move.date.gte = input.dateFrom;
        if (input.dateTo) whereClause.move.date.lte = input.dateTo;
      }

      const lineCount = await ctx.db.moveLineItem.count({ where: whereClause });
      if (lineCount > 5000) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Too many entries (${lineCount}). Please narrow the date range.`,
        });
      }

      const lines = await ctx.db.moveLineItem.findMany({
        where: whereClause,
        select: {
          id: true,
          debit: true,
          credit: true,
          amountCurrency: true,
          name: true,
          currency: { select: { code: true, symbol: true } },
          move: { select: { id: true, name: true, ref: true, date: true } },
          partner: { select: { id: true, name: true } },
        },
        orderBy: [{ move: { date: "asc" } }, { sequence: "asc" }],
      });

      // Compute closing balance
      let closingBalance = openingBalance;
      for (const line of lines) {
        closingBalance = closingBalance
          .plus(new Decimal(line.debit.toString()))
          .minus(new Decimal(line.credit.toString()));
      }

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);

      return {
        baseCurrency,
        account,
        openingBalance: openingBalance.toNumber(),
        lines: lines.map((line) => ({
          id: line.id,
          date: line.move.date.toISOString(),
          moveName: line.move.name,
          moveRef: line.move.ref,
          partnerName: line.partner?.name ?? null,
          label: line.name,
          debit: d(line.debit),
          credit: d(line.credit),
          amountCurrency: d(line.amountCurrency),
          currencyCode: line.currency?.code ?? null,
        })),
        closingBalance: closingBalance.toNumber(),
      };
    }),

  // ── Aged Receivable ──
  agedReceivable: financeProcedure
    .input(z.object({ asOfDate: z.coerce.date().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const asOfDate = input?.asOfDate ?? new Date();

      const invoices = await ctx.db.move.findMany({
        where: {
          companyId: ctx.companyId,
          state: "POSTED",
          moveType: { in: ["OUT_INVOICE", "OUT_REFUND"] },
          paymentState: { in: ["NOT_PAID", "PARTIAL", "IN_PAYMENT"] },
        },
        select: {
          id: true,
          partnerId: true,
          amountResidual: true,
          invoiceDateDue: true,
          date: true,
          partner: { select: { id: true, name: true } },
        },
      });

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return { baseCurrency, ...buildAgedReport(invoices, asOfDate) };
    }),

  // ── Aged Payable ──
  agedPayable: financeProcedure
    .input(z.object({ asOfDate: z.coerce.date().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const asOfDate = input?.asOfDate ?? new Date();

      const bills = await ctx.db.move.findMany({
        where: {
          companyId: ctx.companyId,
          state: "POSTED",
          moveType: { in: ["IN_INVOICE", "IN_REFUND"] },
          paymentState: { in: ["NOT_PAID", "PARTIAL", "IN_PAYMENT"] },
        },
        select: {
          id: true,
          partnerId: true,
          amountResidual: true,
          invoiceDateDue: true,
          date: true,
          partner: { select: { id: true, name: true } },
        },
      });

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return { baseCurrency, ...buildAgedReport(bills, asOfDate) };
    }),

  // ── Cash Flow Statement (Indirect Method) ──
  cashFlow: financeProcedure
    .input(z.object({ dateFrom: z.coerce.date(), dateTo: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const { companyId } = ctx;

      // Get balance at start and end for balance-sheet accounts
      const openingTypes = [
        ...REPORT_ASSET_TYPES,
        ...REPORT_LIABILITY_TYPES,
        ...REPORT_EQUITY_TYPES,
      ];

      const [openingBalances, closingLines, plLines, depreciationLines] = await Promise.all([
        // Balance before dateFrom
        ctx.db.moveLineItem.findMany({
          where: {
            move: { companyId, state: "POSTED", date: { lt: input.dateFrom } },
            account: { accountType: { in: openingTypes } },
          },
          select: { accountId: true, debit: true, credit: true, account: { select: { accountType: true } } },
        }),
        // Balance up to dateTo
        ctx.db.moveLineItem.findMany({
          where: {
            move: { companyId, state: "POSTED", date: { lte: input.dateTo } },
            account: { accountType: { in: openingTypes } },
          },
          select: { accountId: true, debit: true, credit: true, account: { select: { accountType: true } } },
        }),
        // P&L for the period (Net Income)
        ctx.db.moveLineItem.findMany({
          where: {
            move: { companyId, state: "POSTED", date: { gte: input.dateFrom, lte: input.dateTo } },
            account: { accountType: { in: [...REPORT_INCOME_TYPES, ...REPORT_EXPENSE_TYPES] } },
          },
          select: { debit: true, credit: true, account: { select: { accountType: true } } },
        }),
        // Depreciation (non-cash expense to add back)
        ctx.db.moveLineItem.findMany({
          where: {
            move: { companyId, state: "POSTED", date: { gte: input.dateFrom, lte: input.dateTo } },
            account: { accountType: "EXPENSE_DEPRECIATION" },
          },
          select: { debit: true, credit: true },
        }),
      ]);

      // Aggregate helpers
      function aggregateByType(lines: typeof openingBalances) {
        const map = new Map<string, { debit: Decimal; credit: Decimal }>();
        for (const line of lines) {
          const type = line.account.accountType;
          const existing = map.get(type);
          if (existing) {
            existing.debit = existing.debit.plus(new Decimal(line.debit.toString()));
            existing.credit = existing.credit.plus(new Decimal(line.credit.toString()));
          } else {
            map.set(type, {
              debit: new Decimal(line.debit.toString()),
              credit: new Decimal(line.credit.toString()),
            });
          }
        }
        return map;
      }

      const openMap = aggregateByType(openingBalances);
      const closeMap = aggregateByType(closingLines);

      // Net balance change per account type (closing - opening)
      function netChange(type: string, isDebitNormal: boolean): number {
        const openD = openMap.get(type)?.debit ?? new Decimal(0);
        const openC = openMap.get(type)?.credit ?? new Decimal(0);
        const closeD = closeMap.get(type)?.debit ?? new Decimal(0);
        const closeC = closeMap.get(type)?.credit ?? new Decimal(0);
        const openBal = isDebitNormal ? openD.minus(openC) : openC.minus(openD);
        const closeBal = isDebitNormal ? closeD.minus(closeC) : closeC.minus(openD);
        return closeBal.minus(openBal).toNumber();
      }

      // Net Income
      let netIncome = new Decimal(0);
      for (const line of plLines) {
        const type = line.account.accountType;
        const debit = new Decimal(line.debit.toString());
        const credit = new Decimal(line.credit.toString());
        if ((REPORT_INCOME_TYPES as readonly string[]).includes(type)) {
          netIncome = netIncome.plus(credit.minus(debit));
        } else {
          netIncome = netIncome.minus(debit.minus(credit));
        }
      }

      // Depreciation add-back
      const depreciation = depreciationLines.reduce((s, l) => {
        return s.plus(new Decimal(l.debit.toString())).minus(new Decimal(l.credit.toString()));
      }, new Decimal(0));

      // Working capital changes (Operating)
      const changeInReceivables = -netChange("ASSET_RECEIVABLE", true);  // increase in AR = less cash
      const changeInCurrentAssets = -netChange("ASSET_CURRENT", true);
      const changeInPrepayments = -netChange("ASSET_PREPAYMENTS", true);
      const changeInPayables = netChange("LIABILITY_PAYABLE", false);     // increase in AP = more cash
      const changeInCurrentLiabilities = netChange("LIABILITY_CURRENT", false);

      const operatingTotal = netIncome.toNumber() + depreciation.toNumber()
        + changeInReceivables + changeInCurrentAssets + changeInPrepayments
        + changeInPayables + changeInCurrentLiabilities;

      // Investing
      const changeInFixedAssets = -netChange("ASSET_FIXED", true);
      const changeInNonCurrentAssets = -netChange("ASSET_NON_CURRENT", true);
      const investingTotal = changeInFixedAssets + changeInNonCurrentAssets;

      // Financing
      const changeInNonCurrentLiabilities = netChange("LIABILITY_NON_CURRENT", false);
      const changeInEquity = netChange("EQUITY", false) + netChange("EQUITY_UNAFFECTED", false);
      const financingTotal = changeInNonCurrentLiabilities + changeInEquity;

      // Cash balances
      const openingCash = (() => {
        const od = openMap.get("ASSET_CASH")?.debit ?? new Decimal(0);
        const oc = openMap.get("ASSET_CASH")?.credit ?? new Decimal(0);
        const cd = openMap.get("LIABILITY_CREDIT_CARD")?.debit ?? new Decimal(0);
        const cc = openMap.get("LIABILITY_CREDIT_CARD")?.credit ?? new Decimal(0);
        return od.minus(oc).minus(cc.minus(cd)).toNumber();
      })();

      const netCashChange = operatingTotal + investingTotal + financingTotal;
      const closingCash = openingCash + netCashChange;

      const baseCurrency = await getBaseCurrency(ctx.db, companyId);
      return {
        baseCurrency,
        dateFrom: input.dateFrom.toISOString(),
        dateTo: input.dateTo.toISOString(),
        netIncome: netIncome.toNumber(),
        depreciation: depreciation.toNumber(),
        operating: {
          netIncome: netIncome.toNumber(),
          depreciation: depreciation.toNumber(),
          changeInReceivables,
          changeInCurrentAssets,
          changeInPrepayments,
          changeInPayables,
          changeInCurrentLiabilities,
          total: operatingTotal,
        },
        investing: {
          changeInFixedAssets,
          changeInNonCurrentAssets,
          total: investingTotal,
        },
        financing: {
          changeInNonCurrentLiabilities,
          changeInEquity,
          total: financingTotal,
        },
        openingCash,
        netCashChange,
        closingCash,
      };
    }),

  // ── Partner Ledger ──
  partnerLedger: financeProcedure
    .input(z.object({
      partnerId: z.string(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {
        partnerId: input.partnerId,
        move: { companyId: ctx.companyId, state: "POSTED" },
      };
      if (input.dateFrom || input.dateTo) {
        where.move.date = {};
        if (input.dateFrom) where.move.date.gte = input.dateFrom;
        if (input.dateTo) where.move.date.lte = input.dateTo;
      }

      // Opening balance (before dateFrom)
      let openingDebit = new Decimal(0);
      let openingCredit = new Decimal(0);
      if (input.dateFrom) {
        const openingResult = await ctx.db.moveLineItem.aggregate({
          where: {
            partnerId: input.partnerId,
            move: { companyId: ctx.companyId, state: "POSTED", date: { lt: input.dateFrom } },
          },
          _sum: { debit: true, credit: true },
        });
        openingDebit = new Decimal(openingResult._sum.debit?.toString() ?? "0");
        openingCredit = new Decimal(openingResult._sum.credit?.toString() ?? "0");
      }

      const partner = await ctx.db.partner.findFirst({
        where: { id: input.partnerId, companyId: ctx.companyId },
        select: { id: true, name: true },
      });

      const lines = await ctx.db.moveLineItem.findMany({
        where,
        select: {
          id: true, debit: true, credit: true, name: true,
          move: { select: { id: true, name: true, ref: true, date: true, moveType: true } },
          account: { select: { id: true, code: true, name: true } },
          currency: { select: { code: true, symbol: true } },
          amountCurrency: true,
        },
        orderBy: [{ move: { date: "asc" } }, { sequence: "asc" }],
      });

      let runningBalance = openingDebit.minus(openingCredit);
      const processedLines = lines.map((line) => {
        runningBalance = runningBalance
          .plus(new Decimal(line.debit.toString()))
          .minus(new Decimal(line.credit.toString()));
        return {
          id: line.id,
          date: line.move.date.toISOString(),
          moveName: line.move.name,
          moveRef: line.move.ref,
          moveType: line.move.moveType,
          accountCode: line.account.code,
          accountName: line.account.name,
          label: line.name,
          debit: d(line.debit),
          credit: d(line.credit),
          balance: runningBalance.toNumber(),
          amountCurrency: d(line.amountCurrency),
          currencyCode: line.currency?.code ?? null,
        };
      });

      const periodDebit = lines.reduce((s, l) => s.plus(new Decimal(l.debit.toString())), new Decimal(0));
      const periodCredit = lines.reduce((s, l) => s.plus(new Decimal(l.credit.toString())), new Decimal(0));

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return {
        baseCurrency,
        partner: partner ?? { id: input.partnerId, name: "Unknown" },
        openingBalance: openingDebit.minus(openingCredit).toNumber(),
        lines: processedLines,
        periodDebit: periodDebit.toNumber(),
        periodCredit: periodCredit.toNumber(),
        closingBalance: runningBalance.toNumber(),
      };
    }),

  // ── Tax Report ──
  taxReport: financeProcedure
    .input(z.object({ dateFrom: z.coerce.date(), dateTo: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      // Tax lines: MoveLineItems where taxLineId is set
      const taxLines = await ctx.db.moveLineItem.findMany({
        where: {
          move: { companyId: ctx.companyId, state: "POSTED", date: { gte: input.dateFrom, lte: input.dateTo } },
          taxLineId: { not: null },
        },
        select: {
          debit: true, credit: true, taxLineId: true,
          move: { select: { moveType: true } },
        },
      });

      // Fetch tax details for all referenced taxLineIds
      const taxIds = [...new Set(taxLines.map((l) => l.taxLineId).filter(Boolean))] as string[];
      const taxDetails = taxIds.length
        ? await ctx.db.tax.findMany({
            where: { id: { in: taxIds } },
            select: { id: true, name: true, amount: true, typeTaxUse: true, amountType: true },
          })
        : [];
      const taxDetailMap = new Map(taxDetails.map((t) => [t.id, t]));

      // Group by tax
      const taxMap = new Map<string, {
        taxId: string; taxName: string; rate: number; taxType: string;
        saleTaxAmount: Decimal; purchaseTaxAmount: Decimal;
      }>();

      for (const line of taxLines) {
        if (!line.taxLineId) continue;
        const tax = taxDetailMap.get(line.taxLineId);
        if (!tax) continue;
        const amount = new Decimal(line.credit.toString()).minus(new Decimal(line.debit.toString()));
        const isSale = ["OUT_INVOICE", "OUT_REFUND"].includes(line.move.moveType);

        if (!taxMap.has(tax.id)) {
          taxMap.set(tax.id, {
            taxId: tax.id,
            taxName: tax.name,
            rate: d(tax.amount),
            taxType: tax.typeTaxUse ?? "",
            saleTaxAmount: new Decimal(0),
            purchaseTaxAmount: new Decimal(0),
          });
        }
        const entry = taxMap.get(tax.id)!;
        if (isSale) entry.saleTaxAmount = entry.saleTaxAmount.plus(amount);
        else entry.purchaseTaxAmount = entry.purchaseTaxAmount.plus(amount);
      }

      const taxes = Array.from(taxMap.values()).map((t) => ({
        taxId: t.taxId,
        taxName: t.taxName,
        rate: t.rate,
        taxType: t.taxType,
        saleTaxAmount: t.saleTaxAmount.toNumber(),
        purchaseTaxAmount: t.purchaseTaxAmount.toNumber(),
        netTaxAmount: t.saleTaxAmount.minus(t.purchaseTaxAmount).toNumber(),
      })).sort((a, b) => a.taxName.localeCompare(b.taxName));

      const totals = {
        saleTaxAmount: taxes.reduce((s, t) => s + t.saleTaxAmount, 0),
        purchaseTaxAmount: taxes.reduce((s, t) => s + t.purchaseTaxAmount, 0),
        netTaxAmount: taxes.reduce((s, t) => s + t.netTaxAmount, 0),
      };

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return {
        baseCurrency,
        dateFrom: input.dateFrom.toISOString(),
        dateTo: input.dateTo.toISOString(),
        taxes,
        totals,
      };
    }),

  // ── Fiscal Report (P&L by month within fiscal year) ──
  fiscalReport: financeProcedure
    .input(z.object({ year: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const dateFrom = new Date(input.year, 0, 1);
      const dateTo = new Date(input.year, 11, 31, 23, 59, 59);

      const lines = await ctx.db.moveLineItem.findMany({
        where: {
          move: {
            companyId: ctx.companyId,
            state: "POSTED",
            date: { gte: dateFrom, lte: dateTo },
          },
          account: { accountType: { in: [...REPORT_INCOME_TYPES, ...REPORT_EXPENSE_TYPES] } },
        },
        select: {
          debit: true, credit: true,
          account: { select: { accountType: true } },
          move: { select: { date: true } },
        },
      });

      // Build monthly buckets
      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        label: new Date(input.year, i, 1).toLocaleString("default", { month: "short" }),
        income: new Decimal(0),
        expenses: new Decimal(0),
      }));

      for (const line of lines) {
        const m = new Date(line.move.date).getMonth(); // 0-indexed
        const debit = new Decimal(line.debit.toString());
        const credit = new Decimal(line.credit.toString());
        const isIncome = (REPORT_INCOME_TYPES as readonly string[]).includes(line.account.accountType);
        if (isIncome) {
          months[m].income = months[m].income.plus(credit.minus(debit));
        } else {
          months[m].expenses = months[m].expenses.plus(debit.minus(credit));
        }
      }

      const result = months.map((m) => ({
        month: m.month,
        label: m.label,
        income: m.income.toNumber(),
        expenses: m.expenses.toNumber(),
        netProfit: m.income.minus(m.expenses).toNumber(),
      }));

      const totals = {
        income: result.reduce((s, m) => s + m.income, 0),
        expenses: result.reduce((s, m) => s + m.expenses, 0),
        netProfit: result.reduce((s, m) => s + m.netProfit, 0),
      };

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return { baseCurrency, year: input.year, months: result, totals };
    }),

  // ── 1099 Report ──
  report1099: financeProcedure
    .input(z.object({ year: z.number().int(), threshold: z.number().default(600) }))
    .query(async ({ ctx, input }) => {
      const dateFrom = new Date(input.year, 0, 1);
      const dateTo = new Date(input.year, 11, 31, 23, 59, 59);

      const bills = await ctx.db.move.findMany({
        where: {
          companyId: ctx.companyId,
          state: "POSTED",
          moveType: { in: ["IN_INVOICE", "IN_REFUND"] },
          date: { gte: dateFrom, lte: dateTo },
          partnerId: { not: null },
        },
        select: {
          id: true, name: true, amountTotal: true, date: true, moveType: true,
          partner: { select: { id: true, name: true, taxId: true } },
        },
      });

      const partnerMap = new Map<string, {
        partnerId: string; partnerName: string; taxId: string | null;
        total: Decimal; invoiceCount: number;
      }>();

      for (const bill of bills) {
        if (!bill.partner) continue;
        const pid = bill.partner.id;
        const amount = new Decimal(bill.amountTotal.toString());
        const sign = bill.moveType === "IN_REFUND" ? -1 : 1;

        if (!partnerMap.has(pid)) {
          partnerMap.set(pid, {
            partnerId: pid,
            partnerName: bill.partner.name,
            taxId: bill.partner.taxId ?? null,
            total: new Decimal(0),
            invoiceCount: 0,
          });
        }
        const entry = partnerMap.get(pid)!;
        entry.total = entry.total.plus(amount.times(sign));
        entry.invoiceCount++;
      }

      const vendors = Array.from(partnerMap.values())
        .map((v) => ({
          partnerId: v.partnerId,
          partnerName: v.partnerName,
          taxId: v.taxId,
          total: v.total.toNumber(),
          invoiceCount: v.invoiceCount,
          reportable: v.total.toNumber() >= input.threshold,
        }))
        .sort((a, b) => b.total - a.total);

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return {
        baseCurrency,
        year: input.year,
        threshold: input.threshold,
        vendors,
        reportableCount: vendors.filter((v) => v.reportable).length,
        reportableTotal: vendors.filter((v) => v.reportable).reduce((s, v) => s + v.total, 0),
      };
    }),

  // ── Invoice Analysis ──
  invoiceAnalysis: financeProcedure
    .input(z.object({
      dateFrom: z.coerce.date(),
      dateTo: z.coerce.date(),
      moveType: z.enum(["OUT_INVOICE", "IN_INVOICE", "ALL"]).default("OUT_INVOICE"),
    }))
    .query(async ({ ctx, input }) => {
      const moveTypeFilter = input.moveType === "ALL"
        ? { in: ["OUT_INVOICE", "IN_INVOICE"] as const }
        : input.moveType;

      const moves = await ctx.db.move.findMany({
        where: {
          companyId: ctx.companyId,
          state: "POSTED",
          moveType: moveTypeFilter as any,
          date: { gte: input.dateFrom, lte: input.dateTo },
        },
        select: {
          id: true, name: true, amountTotal: true, amountResidual: true,
          date: true, moveType: true, paymentState: true, invoiceDateDue: true,
          partner: { select: { id: true, name: true } },
        },
      });

      // By status
      const byStatus = new Map<string, { count: number; total: Decimal }>();
      // By partner (top 10)
      const byPartner = new Map<string, { name: string; count: number; total: Decimal }>();
      // By month
      const byMonth = new Map<string, { count: number; total: Decimal }>();

      let totalAmount = new Decimal(0);
      let totalOutstanding = new Decimal(0);

      for (const move of moves) {
        const amount = new Decimal(move.amountTotal.toString());
        const residual = new Decimal(move.amountResidual.toString());
        totalAmount = totalAmount.plus(amount);
        totalOutstanding = totalOutstanding.plus(residual);

        // By status
        const status = move.paymentState;
        const statusEntry = byStatus.get(status) ?? { count: 0, total: new Decimal(0) };
        statusEntry.count++;
        statusEntry.total = statusEntry.total.plus(amount);
        byStatus.set(status, statusEntry);

        // By partner
        if (move.partner) {
          const pid = move.partner.id;
          const pEntry = byPartner.get(pid) ?? { name: move.partner.name, count: 0, total: new Decimal(0) };
          pEntry.count++;
          pEntry.total = pEntry.total.plus(amount);
          byPartner.set(pid, pEntry);
        }

        // By month
        const monthKey = new Date(move.date).toISOString().slice(0, 7);
        const mEntry = byMonth.get(monthKey) ?? { count: 0, total: new Decimal(0) };
        mEntry.count++;
        mEntry.total = mEntry.total.plus(amount);
        byMonth.set(monthKey, mEntry);
      }

      const count = moves.length;
      const avgAmount = count > 0 ? totalAmount.dividedBy(count).toNumber() : 0;

      const paymentDelay = moves
        .filter((m) => m.invoiceDateDue && m.paymentState === "PAID")
        .map((m) => daysBetween(m.date, m.invoiceDateDue!));
      const avgPaymentDelay = paymentDelay.length > 0
        ? Math.round(paymentDelay.reduce((s, v) => s + v, 0) / paymentDelay.length)
        : 0;

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return {
        baseCurrency,
        dateFrom: input.dateFrom.toISOString(),
        dateTo: input.dateTo.toISOString(),
        count,
        totalAmount: totalAmount.toNumber(),
        totalOutstanding: totalOutstanding.toNumber(),
        avgAmount,
        avgPaymentDelay,
        byStatus: Array.from(byStatus.entries()).map(([status, v]) => ({ status, count: v.count, total: v.total.toNumber() })),
        byPartner: Array.from(byPartner.entries())
          .map(([id, v]) => ({ partnerId: id, partnerName: v.name, count: v.count, total: v.total.toNumber() }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10),
        byMonth: Array.from(byMonth.entries())
          .map(([month, v]) => ({ month, count: v.count, total: v.total.toNumber() }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      };
    }),

  // ── Analytic Report (P&L by Journal) ──
  analyticReport: financeProcedure
    .input(z.object({ dateFrom: z.coerce.date(), dateTo: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const lines = await ctx.db.moveLineItem.findMany({
        where: {
          move: {
            companyId: ctx.companyId,
            state: "POSTED",
            date: { gte: input.dateFrom, lte: input.dateTo },
          },
          account: { accountType: { in: [...REPORT_INCOME_TYPES, ...REPORT_EXPENSE_TYPES] } },
        },
        select: {
          debit: true, credit: true,
          account: { select: { accountType: true } },
          move: { select: { journalId: true, journal: { select: { id: true, name: true, code: true } } } },
        },
      });

      const journalMap = new Map<string, { journalId: string; journalName: string; journalCode: string; income: Decimal; expenses: Decimal }>();

      for (const line of lines) {
        const journalId = line.move.journalId;
        const journal = line.move.journal;
        if (!journal) continue;

        const existing = journalMap.get(journalId) ?? {
          journalId, journalName: journal.name, journalCode: journal.code, income: new Decimal(0), expenses: new Decimal(0),
        };

        const debit = new Decimal(line.debit.toString());
        const credit = new Decimal(line.credit.toString());
        const isIncome = (REPORT_INCOME_TYPES as readonly string[]).includes(line.account.accountType);

        if (isIncome) existing.income = existing.income.plus(credit.minus(debit));
        else existing.expenses = existing.expenses.plus(debit.minus(credit));

        journalMap.set(journalId, existing);
      }

      const journals = Array.from(journalMap.values())
        .map((j) => ({
          journalId: j.journalId,
          journalName: j.journalName,
          journalCode: j.journalCode,
          income: j.income.toNumber(),
          expenses: j.expenses.toNumber(),
          netProfit: j.income.minus(j.expenses).toNumber(),
        }))
        .sort((a, b) => b.income - a.income);

      const totals = {
        income: journals.reduce((s, j) => s + j.income, 0),
        expenses: journals.reduce((s, j) => s + j.expenses, 0),
        netProfit: journals.reduce((s, j) => s + j.netProfit, 0),
      };

      const baseCurrency = await getBaseCurrency(ctx.db, ctx.companyId);
      return {
        baseCurrency,
        dateFrom: input.dateFrom.toISOString(),
        dateTo: input.dateTo.toISOString(),
        journals,
        totals,
      };
    }),

  // ── Executive Summary ──
  executiveSummary: financeProcedure
    .input(z.object({ dateFrom: z.coerce.date(), dateTo: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const { companyId } = ctx;

      const [incomeLines, cashLines, receivableAgg, payableAgg, topCustomers, topExpenses, monthlyData] = await Promise.all([
        // P&L lines for the period
        ctx.db.moveLineItem.findMany({
          where: {
            move: { companyId, state: "POSTED", date: { gte: input.dateFrom, lte: input.dateTo } },
            account: { accountType: { in: [...REPORT_INCOME_TYPES, ...REPORT_EXPENSE_TYPES] } },
          },
          select: { debit: true, credit: true, account: { select: { accountType: true } } },
        }),
        // Cash balance (all time up to dateTo)
        ctx.db.moveLineItem.aggregate({
          where: {
            move: { companyId, state: "POSTED", date: { lte: input.dateTo } },
            account: { accountType: { in: ["ASSET_CASH", "LIABILITY_CREDIT_CARD"] } },
          },
          _sum: { debit: true, credit: true },
        }),
        // AR outstanding
        ctx.db.move.aggregate({
          where: {
            companyId, state: "POSTED", moveType: { in: ["OUT_INVOICE", "OUT_REFUND"] },
            paymentState: { in: ["NOT_PAID", "PARTIAL", "IN_PAYMENT"] },
          },
          _sum: { amountResidual: true },
        }),
        // AP outstanding
        ctx.db.move.aggregate({
          where: {
            companyId, state: "POSTED", moveType: { in: ["IN_INVOICE", "IN_REFUND"] },
            paymentState: { in: ["NOT_PAID", "PARTIAL", "IN_PAYMENT"] },
          },
          _sum: { amountResidual: true },
        }),
        // Top 5 customers by revenue in period
        ctx.db.move.groupBy({
          by: ["partnerId"],
          where: {
            companyId, state: "POSTED", moveType: "OUT_INVOICE",
            date: { gte: input.dateFrom, lte: input.dateTo }, partnerId: { not: null },
          },
          _sum: { amountTotal: true },
          orderBy: { _sum: { amountTotal: "desc" } },
          take: 5,
        }),
        // Expense by account type
        ctx.db.moveLineItem.groupBy({
          by: ["accountId"],
          where: {
            move: { companyId, state: "POSTED", date: { gte: input.dateFrom, lte: input.dateTo } },
            account: { accountType: { in: [...REPORT_EXPENSE_TYPES] } },
          },
          _sum: { debit: true, credit: true },
          orderBy: { _sum: { debit: "desc" } },
          take: 5,
        }),
        // Monthly revenue vs expense trend
        ctx.db.moveLineItem.findMany({
          where: {
            move: { companyId, state: "POSTED", date: { gte: input.dateFrom, lte: input.dateTo } },
            account: { accountType: { in: [...REPORT_INCOME_TYPES, ...REPORT_EXPENSE_TYPES] } },
          },
          select: { debit: true, credit: true, account: { select: { accountType: true } }, move: { select: { date: true } } },
        }),
      ]);

      // Compute P&L
      let revenue = new Decimal(0), expenses = new Decimal(0);
      for (const line of incomeLines) {
        const isIncome = (REPORT_INCOME_TYPES as readonly string[]).includes(line.account.accountType);
        const debit = new Decimal(line.debit.toString());
        const credit = new Decimal(line.credit.toString());
        if (isIncome) revenue = revenue.plus(credit.minus(debit));
        else expenses = expenses.plus(debit.minus(credit));
      }

      // Monthly buckets
      const monthMap = new Map<string, { revenue: Decimal; expenses: Decimal }>();
      for (const line of monthlyData) {
        const key = new Date(line.move.date).toISOString().slice(0, 7);
        const existing = monthMap.get(key) ?? { revenue: new Decimal(0), expenses: new Decimal(0) };
        const debit = new Decimal(line.debit.toString());
        const credit = new Decimal(line.credit.toString());
        const isIncome = (REPORT_INCOME_TYPES as readonly string[]).includes(line.account.accountType);
        if (isIncome) existing.revenue = existing.revenue.plus(credit.minus(debit));
        else existing.expenses = existing.expenses.plus(debit.minus(credit));
        monthMap.set(key, existing);
      }

      const trend = Array.from(monthMap.entries())
        .map(([month, v]) => ({ month, revenue: v.revenue.toNumber(), expenses: v.expenses.toNumber(), profit: v.revenue.minus(v.expenses).toNumber() }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Fetch top customer names
      const customerIds = topCustomers.map((c) => c.partnerId!).filter(Boolean);
      const customerNames = customerIds.length
        ? await ctx.db.partner.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true },
          })
        : [];
      const nameMap = new Map(customerNames.map((c) => [c.id, c.name]));

      // Fetch top expense account names
      const expenseAccountIds = topExpenses.map((e) => e.accountId);
      const expenseAccounts = expenseAccountIds.length
        ? await ctx.db.finAccount.findMany({
            where: { id: { in: expenseAccountIds } },
            select: { id: true, code: true, name: true },
          })
        : [];
      const accMap = new Map(expenseAccounts.map((a) => [a.id, `${a.code} ${a.name}`]));

      const baseCurrency = await getBaseCurrency(ctx.db, companyId);
      const grossMarginPct = revenue.greaterThan(0) ? revenue.minus(expenses).dividedBy(revenue).times(100).toNumber() : 0;

      return {
        baseCurrency,
        dateFrom: input.dateFrom.toISOString(),
        dateTo: input.dateTo.toISOString(),
        revenue: revenue.toNumber(),
        expenses: expenses.toNumber(),
        grossProfit: revenue.minus(expenses).toNumber(),
        grossMarginPct,
        cashPosition: d(cashLines._sum.debit) - d(cashLines._sum.credit),
        totalReceivable: d(receivableAgg._sum.amountResidual),
        totalPayable: d(payableAgg._sum.amountResidual),
        topCustomers: topCustomers.map((c) => ({
          partnerId: c.partnerId,
          partnerName: nameMap.get(c.partnerId!) ?? "Unknown",
          total: d(c._sum.amountTotal),
        })),
        topExpenses: topExpenses.map((e) => ({
          accountId: e.accountId,
          accountName: accMap.get(e.accountId) ?? e.accountId,
          total: d(e._sum.debit) - d(e._sum.credit),
        })),
        trend,
      };
    }),
});

// ── Shared aging helper ──

function buildAgedReport(
  items: Array<{
    id: string;
    partnerId: string | null;
    amountResidual: any;
    invoiceDateDue: Date | null;
    date: Date;
    partner: { id: string; name: string } | null;
  }>,
  asOfDate: Date,
) {
  const partnerMap = new Map<string, {
    partnerId: string;
    partnerName: string;
    current: Decimal;
    days1to30: Decimal;
    days31to60: Decimal;
    days61to90: Decimal;
    days90plus: Decimal;
    total: Decimal;
  }>();

  for (const item of items) {
    const partnerId = item.partnerId ?? "__no_partner__";
    const partnerName = item.partner?.name ?? "No Partner";
    const residual = new Decimal(item.amountResidual.toString());
    const dueDate = item.invoiceDateDue ?? item.date;
    const daysOverdue = daysBetween(dueDate, asOfDate);

    if (!partnerMap.has(partnerId)) {
      partnerMap.set(partnerId, {
        partnerId,
        partnerName,
        current: new Decimal(0),
        days1to30: new Decimal(0),
        days31to60: new Decimal(0),
        days61to90: new Decimal(0),
        days90plus: new Decimal(0),
        total: new Decimal(0),
      });
    }

    const entry = partnerMap.get(partnerId)!;
    entry.total = entry.total.plus(residual);

    if (daysOverdue <= 0) {
      entry.current = entry.current.plus(residual);
    } else if (daysOverdue <= 30) {
      entry.days1to30 = entry.days1to30.plus(residual);
    } else if (daysOverdue <= 60) {
      entry.days31to60 = entry.days31to60.plus(residual);
    } else if (daysOverdue <= 90) {
      entry.days61to90 = entry.days61to90.plus(residual);
    } else {
      entry.days90plus = entry.days90plus.plus(residual);
    }
  }

  const partners = Array.from(partnerMap.values())
    .map((p) => ({
      partnerId: p.partnerId,
      partnerName: p.partnerName,
      current: p.current.toNumber(),
      days1to30: p.days1to30.toNumber(),
      days31to60: p.days31to60.toNumber(),
      days61to90: p.days61to90.toNumber(),
      days90plus: p.days90plus.toNumber(),
      total: p.total.toNumber(),
    }))
    .sort((a, b) => b.total - a.total);

  const totals = {
    current: partners.reduce((s, p) => s + p.current, 0),
    days1to30: partners.reduce((s, p) => s + p.days1to30, 0),
    days31to60: partners.reduce((s, p) => s + p.days31to60, 0),
    days61to90: partners.reduce((s, p) => s + p.days61to90, 0),
    days90plus: partners.reduce((s, p) => s + p.days90plus, 0),
    total: partners.reduce((s, p) => s + p.total, 0),
  };

  return { asOfDate: asOfDate.toISOString(), partners, totals };
}

// ── Balance-before helper ──
async function getAccountBalances(
  db: any,
  companyId: string,
  beforeDate: Date,
  accountTypes?: string[],
): Promise<Map<string, { debit: Decimal; credit: Decimal }>> {
  const where: any = {
    move: { companyId, state: "POSTED", date: { lt: beforeDate } },
  };
  if (accountTypes?.length) where.account = { accountType: { in: accountTypes } };

  const lines = await db.moveLineItem.findMany({
    where,
    select: { accountId: true, debit: true, credit: true, account: { select: { accountType: true } } },
  });

  const map = new Map<string, { debit: Decimal; credit: Decimal; accountType: string }>();
  for (const line of lines) {
    const existing = map.get(line.accountId);
    if (existing) {
      existing.debit = existing.debit.plus(new Decimal(line.debit.toString()));
      existing.credit = existing.credit.plus(new Decimal(line.credit.toString()));
    } else {
      map.set(line.accountId, {
        debit: new Decimal(line.debit.toString()),
        credit: new Decimal(line.credit.toString()),
        accountType: line.account.accountType,
      });
    }
  }
  return map as any;
}
