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
