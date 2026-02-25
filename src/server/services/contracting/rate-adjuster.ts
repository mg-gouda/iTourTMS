/**
 * Rate adjustment utilities for enhanced contract copy
 */

export type CopyRateMode = "FREEZE" | "INCREASE" | "DECREASE" | "AVERAGE";

/**
 * Adjust a rate based on copy mode and percentage
 */
export function adjustRate(
  rate: number,
  mode: CopyRateMode,
  percent?: number,
): number {
  switch (mode) {
    case "FREEZE":
      return rate;
    case "INCREASE":
      return Math.round(rate * (1 + (percent ?? 0) / 100) * 100) / 100;
    case "DECREASE":
      return Math.round(rate * (1 - (percent ?? 0) / 100) * 100) / 100;
    default:
      return rate;
  }
}

/**
 * Compute average of multiple rates
 */
export function averageRates(rates: number[]): number {
  if (rates.length === 0) return 0;
  const sum = rates.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / rates.length) * 100) / 100;
}

/**
 * Shift a date by a number of days
 */
export function shiftDate(date: Date, deltaDays: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + deltaDays);
  return result;
}

/**
 * Calculate the day offset between two dates
 */
export function calculateDateShift(
  sourceValidFrom: Date,
  targetValidFrom: Date,
): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (targetValidFrom.getTime() - sourceValidFrom.getTime()) / msPerDay,
  );
}
