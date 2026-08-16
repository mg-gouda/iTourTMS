import { Decimal } from "decimal.js";

import type { PrismaClient } from "@prisma/client";

/**
 * Currency lines let a booking carry its P&L in more than one currency.
 *
 * The base line is owned by the rate engine and always mirrors the booking's
 * contract-currency totals. Extra lines are typed by the user or converted from
 * base; they are reporting-only — finance still posts in the base currency.
 */

export type CurrencyLineInput = {
  currencyId: string;
  source?: "CALCULATED" | "MANUAL" | "CONVERTED";
  fxRate?: number | null;
  buyingTotal?: number;
  sellingTotal?: number;
  visaHandling?: number;
  calculation?: string | null;
};

/** Profit is always derived, never stored. */
export function lineProfit(line: {
  buyingTotal: Decimal | number | string;
  sellingTotal: Decimal | number | string;
  visaHandling: Decimal | number | string;
}) {
  return new Decimal(line.sellingTotal.toString())
    .minus(line.buyingTotal.toString())
    .plus(line.visaHandling.toString());
}

/** EBD amount for a line — a percentage of what we pay, matching ResLite's cost basis. */
export function ebdAmount(
  buyingTotal: Decimal | number | string,
  ebdPercent: Decimal | number | string,
) {
  return new Decimal(buyingTotal.toString()).times(ebdPercent.toString());
}

/**
 * Keeps the base line in step with the booking totals. Safe to call after every
 * write that can move `buyingTotal` / `sellingTotal` — create, amend, recalc.
 */
export async function syncBaseCurrencyLine(
  db: PrismaClient,
  bookingId: string,
): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { currencyId: true, buyingTotal: true, sellingTotal: true },
  });
  if (!booking) return;

  await db.bookingCurrencyLine.upsert({
    where: { bookingId_currencyId: { bookingId, currencyId: booking.currencyId } },
    create: {
      bookingId,
      currencyId: booking.currencyId,
      isBase: true,
      source: "CALCULATED",
      buyingTotal: booking.buyingTotal,
      sellingTotal: booking.sellingTotal,
    },
    update: {
      isBase: true,
      buyingTotal: booking.buyingTotal,
      sellingTotal: booking.sellingTotal,
    },
  });

  // A currency change leaves the old base line behind — demote it to a plain line.
  await db.bookingCurrencyLine.updateMany({
    where: { bookingId, isBase: true, currencyId: { not: booking.currencyId } },
    data: { isBase: false, source: "MANUAL" },
  });
}
