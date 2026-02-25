/**
 * Stop-sale overlap checker.
 * Extracted from rate-verification router for reuse.
 */

export interface StopSaleRecord {
  dateFrom: Date;
  dateTo: Date;
  reason: string | null;
}

/**
 * Check whether a stay period overlaps any active stop sales.
 * Returns a list of warning strings for each overlapping stop sale.
 */
export function checkStopSales(
  stopSales: StopSaleRecord[],
  checkIn: string,
  checkOut: string,
): string[] {
  const warnings: string[] = [];
  for (const ss of stopSales) {
    const ssFrom = ss.dateFrom.toISOString().slice(0, 10);
    const ssTo = ss.dateTo.toISOString().slice(0, 10);
    if (checkIn <= ssTo && checkOut > ssFrom) {
      warnings.push(
        `Stop sale active ${ssFrom} to ${ssTo}${ss.reason ? `: ${ss.reason}` : ""}`,
      );
    }
  }
  return warnings;
}
