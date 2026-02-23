/**
 * Reconciliation Engine Service
 *
 * Auto-match suggestion algorithm, reconciliation validation,
 * and write-off journal entry generation for bank reconciliation.
 */

import Decimal from "decimal.js";

import type { ComputedLine } from "./move-engine";

// ── Types ──

export interface StatementLineForMatch {
  id: string;
  date: Date;
  name: string;
  ref: string | null;
  amount: Decimal | number;
  partnerId: string | null;
}

export interface JournalItemForMatch {
  id: string;
  date: Date | null;
  name: string | null;
  ref?: string | null;
  debit: Decimal | number;
  credit: Decimal | number;
  partnerId: string | null;
  moveRef?: string | null;
}

export interface MatchSuggestion {
  statementLineId: string;
  journalItemId: string;
  confidence: number;
}

// ── Core Functions ──

/**
 * Auto-match statement lines to journal items using heuristics.
 *
 * Scoring:
 *   - Exact amount match = +50 confidence
 *   - Date within 3 days = +20 confidence
 *   - Reference substring match (case-insensitive) = +30 confidence
 *
 * Returns suggestions with confidence >= 50, sorted descending.
 * Each statement line and journal item appears at most once.
 */
export function suggestMatches(
  statementLines: StatementLineForMatch[],
  journalItems: JournalItemForMatch[],
): MatchSuggestion[] {
  const candidates: MatchSuggestion[] = [];

  for (const stLine of statementLines) {
    const stAmount = new Decimal(stLine.amount);

    for (const jItem of journalItems) {
      let confidence = 0;

      // Amount matching — statement amount should match the net balance of the journal item
      const jDebit = new Decimal(jItem.debit);
      const jCredit = new Decimal(jItem.credit);
      const jBalance = jDebit.minus(jCredit); // positive = debit-heavy

      // For deposits (positive amounts), match against debit journal items
      // For withdrawals (negative amounts), match against credit journal items
      if (stAmount.abs().minus(jBalance.abs()).abs().lessThanOrEqualTo(new Decimal("0.01"))) {
        confidence += 50;
      }

      // Date proximity — within 3 days
      if (jItem.date) {
        const diffMs = Math.abs(stLine.date.getTime() - jItem.date.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays <= 3) {
          confidence += 20;
        }
      }

      // Reference matching — case-insensitive substring match
      const stRef = (stLine.ref || stLine.name || "").toLowerCase();
      const jRef = (jItem.ref || jItem.moveRef || jItem.name || "").toLowerCase();
      if (stRef && jRef && (stRef.includes(jRef) || jRef.includes(stRef))) {
        confidence += 30;
      }

      if (confidence >= 50) {
        candidates.push({
          statementLineId: stLine.id,
          journalItemId: jItem.id,
          confidence,
        });
      }
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Greedy 1:1 assignment — each line and item appears at most once
  const usedStatementLines = new Set<string>();
  const usedJournalItems = new Set<string>();
  const result: MatchSuggestion[] = [];

  for (const c of candidates) {
    if (usedStatementLines.has(c.statementLineId) || usedJournalItems.has(c.journalItemId)) {
      continue;
    }
    result.push(c);
    usedStatementLines.add(c.statementLineId);
    usedJournalItems.add(c.journalItemId);
  }

  return result;
}

/**
 * Validate that statement lines and journal items can be reconciled.
 *
 * The sum of statement line amounts must equal the sum of journal item
 * balances (debit - credit), plus any allowed write-off amount.
 */
export function validateReconciliation(
  statementLineAmounts: (Decimal | number)[],
  journalItemBalances: { debit: Decimal | number; credit: Decimal | number }[],
  writeOffAmount: Decimal | number = 0,
): { isValid: boolean; difference: Decimal } {
  let stTotal = new Decimal(0);
  for (const amount of statementLineAmounts) {
    stTotal = stTotal.plus(new Decimal(amount));
  }

  let jiTotal = new Decimal(0);
  for (const item of journalItemBalances) {
    jiTotal = jiTotal.plus(new Decimal(item.debit).minus(new Decimal(item.credit)));
  }

  const difference = stTotal.minus(jiTotal).minus(new Decimal(writeOffAmount));

  return {
    isValid: difference.abs().lessThanOrEqualTo(new Decimal("0.01")),
    difference: difference.toDecimalPlaces(4),
  };
}

/**
 * Build journal entry lines for a write-off entry to cover reconciliation differences.
 *
 * For example, a bank deposit of 999 matched against a 1,000 invoice
 * generates a 1 write-off entry.
 */
export function buildWriteOffMoveLines(
  writeOffAmount: Decimal | number,
  bankAccountId: string,
  writeOffAccountId: string,
  partnerId?: string | null,
): ComputedLine[] {
  const amount = new Decimal(writeOffAmount).toDecimalPlaces(4);
  const absAmount = amount.abs();
  const isPositive = amount.greaterThan(0);

  // Bank side — if positive write-off, we need to add to bank (debit)
  // to make up for the shortfall from statement line
  const bankLine: ComputedLine = {
    accountId: bankAccountId,
    partnerId,
    name: "Write-Off",
    displayType: "PRODUCT",
    debit: isPositive ? absAmount : new Decimal(0),
    credit: isPositive ? new Decimal(0) : absAmount,
    balance: isPositive ? absAmount : absAmount.neg(),
    amountCurrency: amount,
    quantity: new Decimal(1),
    priceUnit: absAmount,
    discount: new Decimal(0),
    taxIds: [],
    sequence: 10,
  };

  // Write-off side — counterpart
  const writeOffLine: ComputedLine = {
    accountId: writeOffAccountId,
    partnerId,
    name: "Write-Off",
    displayType: "PRODUCT",
    debit: isPositive ? new Decimal(0) : absAmount,
    credit: isPositive ? absAmount : new Decimal(0),
    balance: isPositive ? absAmount.neg() : absAmount,
    amountCurrency: amount.neg(),
    quantity: new Decimal(1),
    priceUnit: absAmount,
    discount: new Decimal(0),
    taxIds: [],
    sequence: 20,
  };

  return [bankLine, writeOffLine];
}
