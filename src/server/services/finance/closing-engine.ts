/**
 * Closing Engine Service
 *
 * Year-end closing logic: computes P&L balances, builds closing journal
 * entry lines that zero out income/expense accounts and transfer the net
 * to retained earnings.
 */

import Decimal from "decimal.js";
import { CLOSING_PL_TYPES } from "@/lib/constants/finance";
import { db } from "@/server/db";
import type { ComputedLine } from "./move-engine";
import { generateSequenceNumber } from "./sequence-generator";

// ── Types ──

export interface PLAccountBalance {
  accountId: string;
  accountType: string;
  totalDebit: Decimal;
  totalCredit: Decimal;
}

export interface ClosingResult {
  closingMoveIds: string[];
  totalIncome: Decimal;
  totalExpenses: Decimal;
  netProfitLoss: Decimal;
  lineCount: number;
}

// ── Core Functions ──

/**
 * Build closing journal entry lines that zero out all P&L accounts.
 *
 * For each P&L account with a non-zero balance:
 *   - If account has net credit (income): debit to zero it out
 *   - If account has net debit (expense): credit to zero it out
 *
 * A single retained earnings line absorbs the net profit/loss.
 */
export function buildClosingLines(
  plBalances: PLAccountBalance[],
  retainedEarningsAccountId: string,
): { lines: ComputedLine[]; netProfitLoss: Decimal } {
  const lines: ComputedLine[] = [];
  let totalClosingDebit = new Decimal(0);
  let totalClosingCredit = new Decimal(0);
  let seq = 10;

  for (const bal of plBalances) {
    const netBalance = bal.totalDebit.minus(bal.totalCredit).toDecimalPlaces(4);
    if (netBalance.isZero()) continue;

    // Reverse the balance: if net debit (expense), credit it; if net credit (income), debit it
    const closingDebit = netBalance.lessThan(0)
      ? netBalance.abs()
      : new Decimal(0);
    const closingCredit = netBalance.greaterThan(0)
      ? netBalance
      : new Decimal(0);

    lines.push({
      accountId: bal.accountId,
      name: "Year-End Closing",
      displayType: "PRODUCT",
      debit: closingDebit,
      credit: closingCredit,
      balance: closingDebit.minus(closingCredit),
      amountCurrency: closingDebit.minus(closingCredit),
      quantity: new Decimal(1),
      priceUnit: closingDebit.plus(closingCredit),
      discount: new Decimal(0),
      taxIds: [],
      sequence: seq,
    });

    totalClosingDebit = totalClosingDebit.plus(closingDebit);
    totalClosingCredit = totalClosingCredit.plus(closingCredit);
    seq += 10;
  }

  // Retained earnings line: the other side of the closing lines.
  // Closing income is a debit, so net profit leaves more debits → credit
  // retained earnings; a loss leaves more credits → debit it. (These were
  // the wrong way round, so closing entries never balanced.)
  const reDebit = totalClosingCredit.greaterThan(totalClosingDebit)
    ? totalClosingCredit.minus(totalClosingDebit)
    : new Decimal(0);
  const reCredit = totalClosingDebit.greaterThan(totalClosingCredit)
    ? totalClosingDebit.minus(totalClosingCredit)
    : new Decimal(0);

  if (!reDebit.isZero() || !reCredit.isZero()) {
    lines.push({
      accountId: retainedEarningsAccountId,
      name: "Year-End Closing — Retained Earnings",
      displayType: "PRODUCT",
      debit: reDebit,
      credit: reCredit,
      balance: reDebit.minus(reCredit),
      amountCurrency: reDebit.minus(reCredit),
      quantity: new Decimal(1),
      priceUnit: reDebit.plus(reCredit),
      discount: new Decimal(0),
      taxIds: [],
      sequence: seq,
    });
  }

  // Net P/L: positive = profit, negative = loss
  const netProfitLoss = totalClosingDebit
    .minus(totalClosingCredit)
    .toDecimalPlaces(4);

  return { lines, netProfitLoss };
}

/**
 * Close a fiscal year: every branch's P&L goes to retained earnings in that
 * branch's own books, one closing entry per branch with activity.
 *
 * Runs on the unscoped client — closing the year is company-wide, whichever
 * branch the person doing it happens to be looking at.
 */
export async function executeYearEndClose(
  companyId: string,
  fiscalYearId: string,
  retainedEarningsAccountId: string,
  journalId: string,
  closingDate: Date,
  userId: string,
): Promise<ClosingResult> {
  const fiscalYear = await db.fiscalYear.findUniqueOrThrow({ where: { id: fiscalYearId } });
  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { baseCurrencyId: true },
  });
  const currencyId = company.baseCurrencyId ?? "";
  const branches = await db.branch.findMany({ where: { companyId }, select: { id: true } });

  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);
  let netProfitLoss = new Decimal(0);
  const closings: { branchId: string; name: string; lines: ComputedLine[]; amountTotal: Decimal }[] = [];

  for (const branch of branches) {
    const plAggregations = await db.moveLineItem.groupBy({
      by: ["accountId"],
      where: {
        move: {
          companyId,
          branchId: branch.id,
          state: "POSTED",
          date: { gte: fiscalYear.dateFrom, lte: fiscalYear.dateTo },
        },
        account: {
          accountType: { in: CLOSING_PL_TYPES as any },
        },
      },
      _sum: { debit: true, credit: true },
    });

    const plBalances: PLAccountBalance[] = plAggregations.map((agg) => ({
      accountId: agg.accountId,
      accountType: "", // not needed for buildClosingLines
      totalDebit: new Decimal(agg._sum.debit?.toString() ?? "0"),
      totalCredit: new Decimal(agg._sum.credit?.toString() ?? "0"),
    }));

    for (const b of plBalances) {
      const net = b.totalCredit.minus(b.totalDebit);
      if (net.greaterThan(0)) totalIncome = totalIncome.plus(net);
      else totalExpenses = totalExpenses.plus(net.negated());
    }

    const built = buildClosingLines(plBalances, retainedEarningsAccountId);
    netProfitLoss = netProfitLoss.plus(built.netProfitLoss);
    if (built.lines.length === 0) continue;

    closings.push({
      branchId: branch.id,
      name: await generateSequenceNumber(db, companyId, "journal_entry", branch.id),
      lines: built.lines,
      amountTotal: built.lines.reduce((sum, l) => sum.plus(l.debit), new Decimal(0)),
    });
  }

  const closingMoveIds = await db.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const c of closings) {
      const move = await tx.move.create({
        data: {
          companyId,
          branchId: c.branchId,
          closesFiscalYearId: fiscalYearId,
          name: c.name,
          moveType: "ENTRY",
          state: "POSTED",
          date: closingDate,
          journalId,
          currencyId,
          companyCurrencyId: currencyId,
          ref: `Year-end closing for ${fiscalYear.name}`,
          amountUntaxed: c.amountTotal,
          amountTax: 0,
          amountTotal: c.amountTotal,
          amountResidual: 0,
          postedAt: new Date(),
          lineItems: {
            create: c.lines.map((line) => ({
              accountId: line.accountId,
              name: line.name,
              displayType: line.displayType as any,
              currencyId,
              debit: line.debit,
              credit: line.credit,
              balance: line.balance,
              amountCurrency: line.amountCurrency,
              quantity: line.quantity,
              priceUnit: line.priceUnit,
              discount: line.discount,
              sequence: line.sequence,
            })),
          },
        },
      });
      ids.push(move.id);
    }

    await tx.fiscalPeriod.updateMany({
      where: { fiscalYearId },
      data: { state: "CLOSED" },
    });
    await tx.fiscalYear.update({
      where: { id: fiscalYearId },
      data: { state: "CLOSED", closedBy: userId, closedAt: new Date() },
    });
    return ids;
  });

  return {
    closingMoveIds,
    totalIncome,
    totalExpenses,
    netProfitLoss,
    lineCount: closings.reduce((n, c) => n + c.lines.length, 0),
  };
}
