import { db } from "@/server/db";
import type { MarkupType } from "@prisma/client";
import { applyMarkup } from "@/server/services/contracting/markup-calculator";

// ── Types ────────────────────────────────────────────────

export interface B2cMarkupTierData {
  dateFrom: Date;
  dateTo: Date;
  markupType: MarkupType;
  value: number; // parsed from Decimal
}

export interface B2cMarkupRuleWithTiers {
  id: string;
  name: string;
  markupType: MarkupType;
  value: number; // default value
  destinationId: string | null;
  hotelId: string | null;
  priority: number;
  tiers: B2cMarkupTierData[];
}

// ── Resolve the best B2C markup rule ─────────────────────
// Scope priority: hotel (+100) > destination (+50) > global (0)
// Within same scope, higher `priority` wins.

export async function resolveB2cMarkup(
  companyId: string,
  hotelId: string,
  destinationId: string | null,
): Promise<B2cMarkupRuleWithTiers | null> {
  const rules = await db.b2cMarkupRule.findMany({
    where: { companyId, active: true },
    include: { tiers: { orderBy: { sortOrder: "asc" } } },
  });

  if (rules.length === 0) return null;

  let best: (typeof rules)[number] | null = null;
  let bestScore = -1;

  for (const rule of rules) {
    let score = 0;

    if (rule.hotelId) {
      if (rule.hotelId === hotelId) score += 100;
      else continue; // wrong hotel — skip
    }

    if (rule.destinationId) {
      if (rule.destinationId === destinationId) score += 50;
      else continue; // wrong destination — skip
    }

    const effective = score * 1000 + rule.priority;
    if (effective > bestScore) {
      bestScore = effective;
      best = rule;
    }
  }

  if (!best) return null;

  return {
    id: best.id,
    name: best.name,
    markupType: best.markupType,
    value: Number(best.value),
    destinationId: best.destinationId,
    hotelId: best.hotelId,
    priority: best.priority,
    tiers: best.tiers.map((t) => ({
      dateFrom: t.dateFrom,
      dateTo: t.dateTo,
      markupType: t.markupType,
      value: Number(t.value),
    })),
  };
}

// ── Apply B2C markup to a net total ─────────────────────

export function applyB2cMarkup(
  netTotal: number,
  rule: B2cMarkupRuleWithTiers,
  checkIn: Date,
  nights: number,
): { displayTotal: number; markupAmount: number } {
  // Check if any tier covers the travel dates
  const checkInTime = new Date(checkIn).getTime();
  const checkOutTime = checkInTime + nights * 86400000;

  // Find the best overlapping tier (most overlap wins)
  let bestTier: B2cMarkupTierData | null = null;
  let bestOverlap = 0;

  for (const tier of rule.tiers) {
    const tierStart = new Date(tier.dateFrom).getTime();
    const tierEnd = new Date(tier.dateTo).getTime() + 86400000; // inclusive end
    const overlapStart = Math.max(checkInTime, tierStart);
    const overlapEnd = Math.min(checkOutTime, tierEnd);
    const overlap = overlapEnd - overlapStart;

    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestTier = tier;
    }
  }

  // Use tier values if found, otherwise use rule defaults
  const markupType = bestTier ? bestTier.markupType : rule.markupType;
  const markupValue = bestTier ? bestTier.value : rule.value;

  const displayTotal = applyMarkup(netTotal, markupType, markupValue, nights);
  const markupAmount = Math.round((displayTotal - netTotal) * 100) / 100;

  return {
    displayTotal: Math.round(displayTotal * 100) / 100,
    markupAmount,
  };
}
