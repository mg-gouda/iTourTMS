/**
 * Period Engine Service
 *
 * Handles fiscal period auto-generation, date-to-period lookups,
 * and period lock validation for move posting.
 */

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

// ── Types ──

export interface GeneratedPeriod {
  name: string;
  code: string;
  number: number;
  dateFrom: Date;
  dateTo: Date;
}

// ── Core Functions ──

/**
 * Generate monthly periods for a fiscal year.
 *
 * Iterates month by month from dateFrom to dateTo, creating one period
 * per calendar month. Optionally adds a 13th adjustment period covering
 * the last day of the fiscal year.
 */
export function generatePeriods(
  dateFrom: Date,
  dateTo: Date,
  includePeriod13: boolean,
): GeneratedPeriod[] {
  const periods: GeneratedPeriod[] = [];
  const current = new Date(dateFrom);
  let number = 1;

  while (current <= dateTo && number <= 12) {
    const year = current.getFullYear();
    const month = current.getMonth();

    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0); // last day of month

    // Clamp to fiscal year bounds
    const clampedStart = periodStart < dateFrom ? dateFrom : periodStart;
    const clampedEnd = periodEnd > dateTo ? dateTo : periodEnd;

    const monthName = clampedStart.toLocaleString("en", {
      month: "long",
      year: "numeric",
    });
    const monthCode = `${year}-${String(month + 1).padStart(2, "0")}`;

    periods.push({
      name: monthName,
      code: monthCode,
      number,
      dateFrom: clampedStart,
      dateTo: clampedEnd,
    });

    number++;
    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }

  if (includePeriod13 && periods.length > 0) {
    const lastPeriod = periods[periods.length - 1];
    periods.push({
      name: `Adjustments ${lastPeriod.dateTo.getFullYear()}`,
      code: `${lastPeriod.dateTo.getFullYear()}-13`,
      number: 13,
      dateFrom: lastPeriod.dateTo,
      dateTo: lastPeriod.dateTo,
    });
  }

  return periods;
}

/**
 * Check if a given date falls within a locked or closed period.
 * Returns the blocking period if found, or null if the date is open.
 */
export async function findLockedPeriodForDate(
  db: PrismaClient,
  companyId: string,
  date: Date,
): Promise<{ id: string; name: string; state: string } | null> {
  return db.fiscalPeriod.findFirst({
    where: {
      fiscalYear: { companyId },
      dateFrom: { lte: date },
      dateTo: { gte: date },
      state: { in: ["LOCKED", "CLOSED"] },
    },
    select: { id: true, name: true, state: true },
  });
}

/**
 * Check if a given date falls within a closed fiscal year.
 * Returns the blocking fiscal year if found, or null if open.
 */
export async function findClosedFiscalYearForDate(
  db: PrismaClient,
  companyId: string,
  date: Date,
): Promise<{ id: string; name: string } | null> {
  return db.fiscalYear.findFirst({
    where: {
      companyId,
      dateFrom: { lte: date },
      dateTo: { gte: date },
      state: "CLOSED",
    },
    select: { id: true, name: true },
  });
}

/**
 * Assert that posting/modifying a move on `date` is allowed.
 *
 * Throws PRECONDITION_FAILED if the date falls in a closed fiscal year
 * or a locked/closed period. If no fiscal year covers the date, posting
 * is allowed (graceful degradation).
 */
export async function assertPeriodOpen(
  db: PrismaClient,
  companyId: string,
  date: Date,
): Promise<void> {
  const closedYear = await findClosedFiscalYearForDate(db, companyId, date);
  if (closedYear) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Cannot post to closed fiscal year: ${closedYear.name}`,
    });
  }

  const lockedPeriod = await findLockedPeriodForDate(db, companyId, date);
  if (lockedPeriod) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Cannot post to ${lockedPeriod.state.toLowerCase()} period: ${lockedPeriod.name}`,
    });
  }
}
