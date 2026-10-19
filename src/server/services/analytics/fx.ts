import type { PrismaClient } from "@prisma/client";

type Db = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">;

/**
 * Converts mixed-currency totals to the company's base currency with each
 * currency's latest rate (Finance > Currencies). Analytics only: postings
 * use the dated rate. Amounts with no rate are left out and their currency
 * reported, so a total is never silently wrong.
 */
export async function fxTable(db: Db, companyId: string) {
  const [company, currencies, rates] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { baseCurrencyId: true } }),
    db.currency.findMany({ select: { id: true, code: true } }),
    db.currencyRate.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      distinct: ["currencyId"],
      select: { currencyId: true, rate: true },
    }),
  ]);
  const baseId = company.baseCurrencyId;
  const code = new Map(currencies.map((c) => [c.id, c.code]));
  const idOf = new Map(currencies.map((c) => [c.code.toUpperCase(), c.id]));
  const rate = new Map(rates.map((r) => [r.currencyId, Number(r.rate)]));
  const missing = new Set<string>();

  /** Amount in base currency, or 0 (and the currency noted) when there is no rate. */
  const toBase = (amount: unknown, currency: string | null | undefined, byCode = false): number => {
    const n = Number(amount ?? 0);
    if (!n) return 0;
    const id = byCode ? idOf.get(String(currency ?? "").toUpperCase()) : currency;
    if (!id || id === baseId) return id ? n : (missing.add(String(currency ?? "?")), 0);
    const r = rate.get(id);
    if (r === undefined) {
      missing.add(code.get(id) ?? String(currency));
      return 0;
    }
    return n * r;
  };

  return { baseCode: (baseId && code.get(baseId)) || "", toBase, missing: () => [...missing].sort() };
}
