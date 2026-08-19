import {
  applyMarkup,
  resolveMarkupRule,
  type MarkupRuleData,
} from "@/server/services/contracting/markup-calculator";
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

// ---------------------------------------------------------------------------
// The staff-side markup: contract rate → PARTNER NET
// ---------------------------------------------------------------------------

/**
 * What the partner pays us.
 *
 * The contract rate is our cost, not their price. Staff set the trade margin
 * per partner in Commercial → Markup Rules, and until this existed the portal
 * skipped it entirely: a partner searched and saw the raw contract rate, which
 * is the one number they must never be shown.
 *
 * Reuses the contracting resolver so a rule means the same thing here as it
 * does on a tariff — same scope hierarchy, same validity dates, same maths.
 */
export interface StaffMarkupContext {
  contractId: string;
  hotelId: string;
  destinationId: string | null;
  marketId: string | null;
  nights: number;
  occupants: number;
}

export async function loadStaffMarkupRules(
  companyId: string,
  tourOperatorId: string,
): Promise<MarkupRuleData[]> {
  const rules = await db.markupRule.findMany({
    where: {
      companyId,
      active: true,
      // Rules aimed at another partner must not leak into this one's pricing.
      OR: [{ tourOperatorId }, { tourOperatorId: null }],
    },
    select: {
      id: true,
      name: true,
      markupType: true,
      value: true,
      contractId: true,
      hotelId: true,
      destinationId: true,
      marketId: true,
      tourOperatorId: true,
      priority: true,
      active: true,
      validFrom: true,
      validTo: true,
    },
  });

  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    markupType: r.markupType,
    value: r.value.toString(),
    contractId: r.contractId,
    hotelId: r.hotelId,
    destinationId: r.destinationId,
    marketId: r.marketId,
    tourOperatorId: r.tourOperatorId,
    priority: r.priority,
    active: r.active,
    validFrom: r.validFrom ? r.validFrom.toISOString().slice(0, 10) : null,
    validTo: r.validTo ? r.validTo.toISOString().slice(0, 10) : null,
  }));
}

export interface PartnerNetResult {
  net: number;
  markupAmount: number;
  ruleName: string | null;
}

/** Applies the best-matching staff rule to one room's contract rate. */
export function applyStaffMarkup(
  rules: MarkupRuleData[],
  contractTotal: number,
  ctx: StaffMarkupContext,
  tourOperatorId: string,
  /** Arrival date, so a rule that has expired stops applying. */
  stayDate: string,
): PartnerNetResult {
  const rule = resolveMarkupRule(rules, {
    contractId: ctx.contractId,
    hotelId: ctx.hotelId,
    destinationId: ctx.destinationId,
    marketId: ctx.marketId,
    tourOperatorId,
    date: stayDate,
  });

  if (!rule) return { net: contractTotal, markupAmount: 0, ruleName: null };

  const net = applyMarkup(
    contractTotal,
    rule.markupType,
    Number(rule.value),
    ctx.nights,
    ctx.occupants,
  );
  const rounded = Math.round(net * 100) / 100;
  return {
    net: rounded,
    markupAmount: Math.round((rounded - contractTotal) * 100) / 100,
    ruleName: rule.name,
  };
}
