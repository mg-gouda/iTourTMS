/**
 * Recurring Entry Engine
 *
 * Computes next run dates, collects due dates, and builds Move data
 * from recurring entry templates.
 */

import Decimal from "decimal.js";

// ── Types ──

export interface RecurringTemplateWithLines {
  id: string;
  companyId: string;
  name: string;
  journalId: string;
  partnerId: string | null;
  currencyId: string;
  ref: string | null;
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  nextRunDate: Date;
  endDate: Date | null;
  totalGenerated: number;
  lineTemplates: Array<{
    accountId: string;
    partnerId: string | null;
    name: string | null;
    debit: Decimal | number;
    credit: Decimal | number;
    sequence: number;
  }>;
}

// ── Core Functions ──

/**
 * Compute the next run date based on frequency.
 */
export function computeNextRunDate(
  currentDate: Date,
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY",
): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Collect all due dates from nextRunDate up to targetDate.
 */
export function collectDueDates(
  nextRunDate: Date,
  endDate: Date | null,
  targetDate: Date,
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY",
): Date[] {
  const dates: Date[] = [];
  let current = new Date(nextRunDate);
  const limit = endDate && endDate < targetDate ? endDate : targetDate;

  while (current <= limit) {
    dates.push(new Date(current));
    current = computeNextRunDate(current, frequency);
  }

  return dates;
}

/**
 * Build Move create data from a recurring entry template.
 * Returns a data object suitable for `db.move.create({ data: ... })`.
 */
export function buildMoveDataFromTemplate(
  template: RecurringTemplateWithLines,
  moveDate: Date,
  companyCurrencyId: string,
) {
  let totalDebit = new Decimal(0);

  const lineItems = template.lineTemplates.map((line) => {
    const debit = new Decimal(line.debit).toDecimalPlaces(4);
    const credit = new Decimal(line.credit).toDecimalPlaces(4);
    totalDebit = totalDebit.plus(debit);

    return {
      accountId: line.accountId,
      partnerId: line.partnerId,
      name: line.name,
      displayType: "PRODUCT" as any,
      currencyId: template.currencyId,
      debit,
      credit,
      balance: debit.minus(credit).toDecimalPlaces(4),
      amountCurrency: debit.minus(credit).abs().toDecimalPlaces(4),
      quantity: new Decimal(1),
      priceUnit: debit.plus(credit).toDecimalPlaces(4),
      discount: new Decimal(0),
      sequence: line.sequence,
    };
  });

  return {
    companyId: template.companyId,
    moveType: "ENTRY" as any,
    state: "DRAFT" as any,
    date: moveDate,
    journalId: template.journalId,
    partnerId: template.partnerId,
    currencyId: template.currencyId,
    companyCurrencyId,
    ref: template.ref ?? `Recurring: ${template.name}`,
    narration: `Auto-generated from recurring template "${template.name}"`,
    amountUntaxed: totalDebit,
    amountTax: new Decimal(0),
    amountTotal: totalDebit,
    amountResidual: new Decimal(0),
    lineItems: { create: lineItems },
  };
}
