/**
 * Bank Statement Engine Service
 *
 * Builds journal entry lines for bank statement validation,
 * computes balance, and parses CSV bank statement imports.
 */

import Decimal from "decimal.js";

import type { ComputedLine } from "./move-engine";

// ── Types ──

export interface StatementLineInput {
  date: Date;
  name: string;
  ref?: string | null;
  partnerId?: string | null;
  amount: Decimal | number;
  sequence: number;
}

export interface ParsedStatementLine {
  date: Date;
  name: string;
  ref: string | null;
  amount: number;
}

// ── Core Functions ──

/**
 * Build journal entry lines for a bank statement validation.
 *
 * For each statement line, creates a pair:
 *   - Bank-side: debit/credit on bank account
 *   - Suspense-side: counterpart on suspense account
 *
 * Positive amount (deposit): debit bank, credit suspense
 * Negative amount (withdrawal): credit bank, debit suspense
 */
export function buildStatementMoveLines(
  lines: StatementLineInput[],
  bankAccountId: string,
  suspenseAccountId: string,
): ComputedLine[] {
  const result: ComputedLine[] = [];
  let seq = 10;

  for (const line of lines) {
    const amount = new Decimal(line.amount).toDecimalPlaces(4);
    const absAmount = amount.abs();
    const isDeposit = amount.greaterThanOrEqualTo(0);

    // Bank-side line
    const bankLine: ComputedLine = {
      accountId: bankAccountId,
      partnerId: line.partnerId,
      name: line.name,
      displayType: "PRODUCT",
      debit: isDeposit ? absAmount : new Decimal(0),
      credit: isDeposit ? new Decimal(0) : absAmount,
      balance: isDeposit ? absAmount : absAmount.neg(),
      amountCurrency: amount,
      quantity: new Decimal(1),
      priceUnit: absAmount,
      discount: new Decimal(0),
      taxIds: [],
      dateMaturity: line.date,
      sequence: seq,
    };
    result.push(bankLine);
    seq += 1;

    // Suspense-side line (counterpart)
    const suspenseLine: ComputedLine = {
      accountId: suspenseAccountId,
      partnerId: line.partnerId,
      name: line.name,
      displayType: "PRODUCT",
      debit: isDeposit ? new Decimal(0) : absAmount,
      credit: isDeposit ? absAmount : new Decimal(0),
      balance: isDeposit ? absAmount.neg() : absAmount,
      amountCurrency: amount.neg(),
      quantity: new Decimal(1),
      priceUnit: absAmount,
      discount: new Decimal(0),
      taxIds: [],
      dateMaturity: line.date,
      sequence: seq,
    };
    result.push(suspenseLine);
    seq += 1;
  }

  return result;
}

/**
 * Compute the real ending balance from a starting balance and statement lines.
 */
export function computeBalanceEnd(
  balanceStart: Decimal | number,
  lines: { amount: Decimal | number }[],
): Decimal {
  let balance = new Decimal(balanceStart);
  for (const line of lines) {
    balance = balance.plus(new Decimal(line.amount));
  }
  return balance.toDecimalPlaces(4);
}

/**
 * Parse CSV content into statement lines.
 *
 * Expected CSV format (with header row):
 *   date,description,amount,reference
 *
 * Throws with row-specific errors for invalid data.
 */
export function parseCSVStatementLines(csvContent: string): ParsedStatementLine[] {
  const lines = csvContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least one data row");
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const results: ParsedStatementLine[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2; // 1-indexed, accounting for header
    const row = dataLines[i];

    // Simple CSV parsing — handles quoted fields
    const fields = parseCSVRow(row);

    if (fields.length < 3) {
      errors.push(`Row ${rowNum}: expected at least 3 columns (date, description, amount), got ${fields.length}`);
      continue;
    }

    const [dateStr, description, amountStr, reference] = fields;

    // Parse date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      errors.push(`Row ${rowNum}: invalid date "${dateStr}"`);
      continue;
    }

    // Parse amount
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      errors.push(`Row ${rowNum}: invalid amount "${amountStr}"`);
      continue;
    }

    if (!description || description.trim().length === 0) {
      errors.push(`Row ${rowNum}: description is required`);
      continue;
    }

    results.push({
      date,
      name: description.trim(),
      ref: reference?.trim() || null,
      amount,
    });
  }

  if (errors.length > 0) {
    throw new Error(`CSV parsing errors:\n${errors.join("\n")}`);
  }

  return results;
}

/**
 * Parse a single CSV row, handling quoted fields.
 */
function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}
