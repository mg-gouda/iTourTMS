import { db } from "@/server/db";

/**
 * The partner's own margin, added on top of what they pay us.
 *
 *   contract rate → staff markup rule → PARTNER NET  (what the partner pays)
 *                                        + pppn × occupants × nights
 *                                     → CLIENT PRICE (what the partner sells at)
 *
 * The client price is display and storage only. It never appears on a document
 * we issue, because it is not our number — it is theirs.
 */

export interface PartnerMarkupRule {
  id: string;
  hotelId: string;
  seasonId: string | null;
  amountPppn: number;
  currencyCode: string;
}

/**
 * Loads the partner's markup rules for a set of hotels in one query.
 * Search shows many hotels at once, so resolving per hotel would mean a query
 * per result row.
 */
export async function loadPartnerMarkupRules(
  tourOperatorId: string,
  hotelIds: string[],
): Promise<Map<string, PartnerMarkupRule[]>> {
  if (hotelIds.length === 0) return new Map();

  const rules = await db.partnerMarkupRule.findMany({
    where: { tourOperatorId, hotelId: { in: hotelIds }, active: true },
    select: {
      id: true,
      hotelId: true,
      seasonId: true,
      amountPppn: true,
      currency: { select: { code: true } },
    },
  });

  const byHotel = new Map<string, PartnerMarkupRule[]>();
  for (const rule of rules) {
    const list = byHotel.get(rule.hotelId) ?? [];
    list.push({
      id: rule.id,
      hotelId: rule.hotelId,
      seasonId: rule.seasonId,
      amountPppn: Number(rule.amountPppn),
      currencyCode: rule.currency.code,
    });
    byHotel.set(rule.hotelId, list);
  }
  return byHotel;
}

/** A season-specific rule beats the hotel-wide one; otherwise nothing applies. */
export function pickMarkupRule(
  rules: PartnerMarkupRule[] | undefined,
  seasonId: string | null,
): PartnerMarkupRule | null {
  if (!rules?.length) return null;
  return (
    (seasonId ? rules.find((r) => r.seasonId === seasonId) : undefined) ??
    rules.find((r) => r.seasonId === null) ??
    null
  );
}

/**
 * Per person per night, counting everyone in the room — infants included.
 * A partner who prices a family of four at a flat per-room figure is not
 * pricing per person, so this stays multiplicative on occupants.
 */
export function applyPartnerMarkup(
  net: number,
  amountPppn: number,
  occupants: number,
  nights: number,
): { markupAmount: number; clientPrice: number } {
  const markupAmount = Math.round(amountPppn * occupants * nights * 100) / 100;
  return { markupAmount, clientPrice: Math.round((net + markupAmount) * 100) / 100 };
}
