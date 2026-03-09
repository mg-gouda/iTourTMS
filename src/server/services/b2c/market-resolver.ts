import { db } from "@/server/db";

/**
 * Resolve a Market for a given company + ISO alpha-2 country code.
 *
 * 1. Look up the Country record by `code` (case-insensitive).
 * 2. Find an active Market whose `countryIds` array contains that country's ID.
 * 3. Return the first matching market, or null.
 */
export async function resolveMarketByCountry(
  companyId: string,
  countryCode: string,
): Promise<{ id: string; name: string; code: string } | null> {
  // Find country by ISO alpha-2 code
  const country = await db.country.findFirst({
    where: { code: { equals: countryCode, mode: "insensitive" } },
    select: { id: true },
  });

  if (!country) return null;

  // Find active market that covers this country
  const market = await db.market.findFirst({
    where: {
      companyId,
      active: true,
      countryIds: { has: country.id },
    },
    select: { id: true, name: true, code: true },
  });

  return market;
}
