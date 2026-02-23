/**
 * Currency Service
 *
 * Exchange rate lookup and currency conversion utilities.
 * Rate semantics: CurrencyRate.rate = base-currency units per 1 foreign unit.
 * e.g., if base=EGP and USD rate=50, then 1 USD = 50 EGP.
 */

import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import type { PrismaClient } from "@prisma/client";

/**
 * Look up the exchange rate for a foreign currency on a given date.
 * Uses the most recent rate on or before the target date.
 * Throws PRECONDITION_FAILED if no rate is found.
 */
export async function getRate(
  db: PrismaClient,
  companyId: string,
  currencyId: string,
  date: Date,
): Promise<Decimal> {
  const rateRecord = await (db as any).currencyRate.findFirst({
    where: {
      currencyId,
      companyId,
      date: { lte: date },
    },
    orderBy: { date: "desc" },
    select: {
      rate: true,
      currency: { select: { code: true } },
    },
  });

  if (!rateRecord) {
    // Try to get the currency code for a better error message
    const currency = await (db as any).currency.findUnique({
      where: { id: currencyId },
      select: { code: true },
    });
    const code = currency?.code ?? currencyId;
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `No exchange rate found for ${code} on or before ${date.toISOString().split("T")[0]}. Please add a rate in Finance > Configuration > Currencies.`,
    });
  }

  return new Decimal(rateRecord.rate.toString());
}

/**
 * Multiply amount (in foreign currency) by rate to get base currency amount.
 * Rounds to 4 decimal places to match Decimal(12,4) schema precision.
 */
export function convert(amount: Decimal, rate: Decimal): Decimal {
  return amount.times(rate).toDecimalPlaces(4);
}

/**
 * Convert an amount from a foreign currency to the company's base currency.
 * If currencyId === baseCurrencyId, returns amount unchanged (rate=1).
 */
export async function convertToBase(
  db: PrismaClient,
  companyId: string,
  currencyId: string,
  baseCurrencyId: string,
  date: Date,
  amount: Decimal,
): Promise<{ convertedAmount: Decimal; rate: Decimal }> {
  if (currencyId === baseCurrencyId) {
    return { convertedAmount: amount, rate: new Decimal(1) };
  }

  const rate = await getRate(db, companyId, currencyId, date);
  return { convertedAmount: convert(amount, rate), rate };
}

/**
 * Convert an amount from the company's base currency to a foreign currency.
 * Divides by rate, rounds to 4 decimal places.
 * If currencyId === baseCurrencyId, returns amount unchanged.
 */
export async function convertFromBase(
  db: PrismaClient,
  companyId: string,
  currencyId: string,
  baseCurrencyId: string,
  date: Date,
  amount: Decimal,
): Promise<{ convertedAmount: Decimal; rate: Decimal }> {
  if (currencyId === baseCurrencyId) {
    return { convertedAmount: amount, rate: new Decimal(1) };
  }

  const rate = await getRate(db, companyId, currencyId, date);
  const convertedAmount = amount.dividedBy(rate).toDecimalPlaces(4);
  return { convertedAmount, rate };
}
