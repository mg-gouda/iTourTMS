/**
 * Closing Engine Service
 *
 * Year-end closing logic: computes P&L balances, builds closing journal
 * entry lines that zero out income/expense accounts and transfer the net
 * to retained earnings.
 */

import Decimal from "decimal.js";
import type { PrismaClient } from "@prisma/client";

import { CLOSING_PL_TYPES } from "@/lib/constants/finance";
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
  closingMoveId: string;
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

  // Retained earnings line: absorbs the difference
  // Net profit (income > expense) → credit retained earnings
  // Net loss (expense > income) → debit retained earnings
  const reDebit = totalClosingCredit.greaterThan(totalClosingDebit)
    ? new Decimal(0)
    : totalClosingDebit.minus(totalClosingCredit);
  const reCredit = totalClosingCredit.greaterThan(totalClosingDebit)
    ? totalClosingCredit.minus(totalClosingDebit)
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
  const netProfitLoss = totalClosingCredit
    .minus(totalClosingDebit)
    .toDecimalPlaces(4);

  return { lines, netProfitLoss };
}

/**
 * Execute the full year-end closing process.
 *
 * 1. Compute P&L balances for the fiscal year
 * 2. Build closing journal entry lines
 * 3. Create the closing Move (directly POSTED)
 * 4. Mark all periods as CLOSED
 * 5. Mark the fiscal year as CLOSED
 */
export async function executeYearEndClose(
  db: PrismaClient,
  companyId: string,
  fiscalYearId: string,
  retainedEarningsAccountId: string,
  journalId: string,
  closingDate: Date,
  userId: string,
): Promise<ClosingResult> {
  // 1. Fetch P&L account balances for the fiscal year
  const fiscalYear = await db.fiscalYear.findUniqueOrThrow({
    where: { id: fiscalYearId },
  });

  const plAggregations = await db.moveLineItem.groupBy({
    by: ["accountId"],
    where: {
      move: {
        companyId,
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

  // 2. Build closing lines
  const { lines, netProfitLoss } = buildClosingLines(
    plBalances,
    retainedEarningsAccountId,
  );

  if (lines.length === 0) {
    // No P&L activity — still close the year but no journal entry needed
    await db.$transaction([
      db.fiscalPeriod.updateMany({
        where: { fiscalYearId },
        data: { state: "CLOSED" },
      }),
      db.fiscalYear.update({
        where: { id: fiscalYearId },
        data: {
          state: "CLOSED",
          closedBy: userId,
          closedAt: new Date(),
        },
      }),
    ]);

    return {
      closingMoveId: "",
      totalIncome: new Decimal(0),
      totalExpenses: new Decimal(0),
      netProfitLoss: new Decimal(0),
      lineCount: 0,
    };
  }

  // 3. Compute totals for the closing move
  let amountTotal = new Decimal(0);
  for (const line of lines) {
    amountTotal = amountTotal.plus(line.debit);
  }

  // 4. Get company currency and generate sequence
  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { baseCurrencyId: true },
  });
  const currencyId = company.baseCurrencyId ?? "";
  const moveName = await generateSequenceNumber(db, companyId, "journal_entry");

  // 5. Create everything in a transaction
  const closingMove = await db.$transaction(async (tx) => {
    const move = await tx.move.create({
      data: {
        companyId,
        name: moveName,
        moveType: "ENTRY",
        state: "POSTED",
        date: closingDate,
        journalId,
        currencyId,
        companyCurrencyId: currencyId,
        ref: `Year-end closing for ${fiscalYear.name}`,
        amountUntaxed: amountTotal,
        amountTax: 0,
        amountTotal: amountTotal,
        amountResidual: 0,
        postedAt: new Date(),
        lineItems: {
          create: lines.map((line) => ({
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

    // Close all periods
    await tx.fiscalPeriod.updateMany({
      where: { fiscalYearId },
      data: { state: "CLOSED" },
    });

    // Close the fiscal year
    await tx.fiscalYear.update({
      where: { id: fiscalYearId },
      data: {
        state: "CLOSED",
        closingMoveId: move.id,
        closedBy: userId,
        closedAt: new Date(),
      },
    });

    return move;
  });

  // Compute income/expense totals for the result
  const totalIncome = plBalances
    .filter((b) => b.totalCredit.greaterThan(b.totalDebit))
    .reduce(
      (sum, b) => sum.plus(b.totalCredit.minus(b.totalDebit)),
      new Decimal(0),
    );
  const totalExpenses = plBalances
    .filter((b) => b.totalDebit.greaterThan(b.totalCredit))
    .reduce(
      (sum, b) => sum.plus(b.totalDebit.minus(b.totalCredit)),
      new Decimal(0),
    );

  return {
    closingMoveId: closingMove.id,
    totalIncome,
    totalExpenses,
    netProfitLoss,
    lineCount: lines.length,
  };
}
