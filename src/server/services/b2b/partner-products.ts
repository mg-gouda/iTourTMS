import type { PartnerProductType } from "@prisma/client";

import { applyMarkup } from "@/server/services/contracting/markup-calculator";
import { db } from "@/server/db";

/**
 * Excursions, transfers and packages as a partner sees them.
 *
 * Each is quoted by staff in its own module — a selling price on an excursion
 * cost sheet, a price item on a transfer route, a package total — and none of
 * them ever reached the portal. This puts the staff figure in front of the
 * partner with the trade margin already on it, so what they read is what they
 * would owe us, never our cost.
 */

export interface ProductMarkup {
  productId: string | null;
  markupType: string;
  value: number;
}

/** Loads a partner's markups for one product type, in one query. */
export async function loadProductMarkups(
  companyId: string,
  tourOperatorId: string,
  productType: PartnerProductType,
): Promise<ProductMarkup[]> {
  const rules = await db.partnerProductMarkup.findMany({
    where: {
      companyId,
      tourOperatorId,
      productType,
      active: true,
      // A rule that has not started or has run out must not price anything.
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }] },
        { OR: [{ validTo: null }, { validTo: { gte: new Date() } }] },
      ],
    },
    select: { productId: true, markupType: true, value: true },
  });

  return rules.map((r) => ({
    productId: r.productId,
    markupType: r.markupType,
    value: Number(r.value),
  }));
}

/**
 * The margin for one product: its own rule if it has one, otherwise the
 * partner's default for the type, otherwise nothing.
 */
export function pickProductMarkup(
  markups: ProductMarkup[],
  productId: string,
): ProductMarkup | null {
  return (
    markups.find((m) => m.productId === productId) ??
    markups.find((m) => m.productId === null) ??
    null
  );
}

export interface PricedProduct {
  /** What staff quote for it. Our figure — not shown to the partner. */
  staffPrice: number;
  /** What the partner pays us. */
  net: number;
  markupAmount: number;
}

/**
 * Applies the margin. Units differ by product, so the caller says what a
 * "night" and a "person" mean here: an excursion is per person for one day, a
 * transfer is per vehicle or per person for one trip, a package is per person
 * for its whole duration.
 */
export function priceProduct(
  markups: ProductMarkup[],
  productId: string,
  staffPrice: number,
  units: { nights: number; occupants: number },
): PricedProduct {
  const rule = pickProductMarkup(markups, productId);
  if (!rule) return { staffPrice, net: staffPrice, markupAmount: 0 };

  const net =
    Math.round(
      applyMarkup(staffPrice, rule.markupType, rule.value, units.nights, units.occupants) * 100,
    ) / 100;

  return { staffPrice, net, markupAmount: Math.round((net - staffPrice) * 100) / 100 };
}
