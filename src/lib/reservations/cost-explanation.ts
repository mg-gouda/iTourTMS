/**
 * Turns a contract rate breakdown into the plain sentences an agent can check
 * against the contract — the same "how this number was reached" trail ResLite
 * kept by hand, except here it is derived from what the engine actually did.
 */

export type ExplainableBreakdown = {
  baseRate?: number;
  baseRateLabel?: string;
  roomTypeSupplement?: { label: string; amount: number } | null;
  mealSupplement?: { label: string; amount: number } | null;
  occupancySupplement?: { label: string; amount: number } | null;
  extraBedSupplement?: { label: string; amount: number } | null;
  childCharges?: { category: string; position: number; amount: number }[];
  adultTotalPerNight?: number;
  childTotalPerNight?: number;
  totalPerNight?: number;
  totalStay?: number;
  offerDiscounts?: { offerName: string; offerType?: string; discount: number; description?: string }[];
  totalStayBeforeOffers?: number;
  totalStayAfterOffers?: number;
  nights?: number;
  rateBasis?: string;
  sellingMarkup?: {
    ruleName?: string | null;
    markupType?: string;
    markupValue?: number;
    markupAmount?: number;
  } | null;
};

export function explainCost(
  breakdown: ExplainableBreakdown | null | undefined,
  opts: { currency?: string; nights?: number; adults?: number; children?: number } = {},
): string[] {
  if (!breakdown) return [];

  const cur = opts.currency ?? "";
  const money = (n: number) =>
    `${cur}${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const nights = breakdown.nights ?? opts.nights ?? 0;
  const lines: string[] = [];

  if (breakdown.baseRate != null) {
    const basis = breakdown.rateBasis === "PER_PERSON" ? "per person / night" : "per room / night";
    lines.push(
      `Base rate ${money(breakdown.baseRate)} ${basis}` +
        (breakdown.baseRateLabel ? ` — ${breakdown.baseRateLabel}` : ""),
    );
  }

  for (const supp of [
    breakdown.roomTypeSupplement,
    breakdown.mealSupplement,
    breakdown.occupancySupplement,
    breakdown.extraBedSupplement,
  ]) {
    if (supp && supp.amount !== 0) {
      lines.push(`${supp.amount > 0 ? "+" : "−"} ${money(Math.abs(supp.amount))}  ${supp.label}`);
    }
  }

  for (const child of breakdown.childCharges ?? []) {
    if (child.amount === 0) continue;
    lines.push(
      `${child.amount > 0 ? "+" : "−"} ${money(Math.abs(child.amount))}  child ${child.position} (${child.category})`,
    );
  }

  if (breakdown.totalPerNight != null && nights > 0) {
    const stay = breakdown.totalStayBeforeOffers ?? breakdown.totalStay;
    lines.push(
      `= ${money(breakdown.totalPerNight)} per night × ${nights} night${nights === 1 ? "" : "s"}` +
        (stay != null ? ` = ${money(stay)}` : ""),
    );
  }

  for (const offer of breakdown.offerDiscounts ?? []) {
    if (!offer.discount) continue;
    lines.push(
      `− ${money(Math.abs(offer.discount))}  ${offer.offerName}` +
        (offer.description ? ` (${offer.description})` : ""),
    );
  }

  if (breakdown.totalStayAfterOffers != null) {
    lines.push(`Cost for the stay: ${money(breakdown.totalStayAfterOffers)}`);
  }

  const markup = breakdown.sellingMarkup;
  if (markup && (markup.markupAmount ?? 0) !== 0) {
    const rule =
      markup.markupType === "PERCENTAGE"
        ? `${markup.markupValue}%`
        : money(markup.markupValue ?? 0);
    lines.push(
      `Selling adds ${money(markup.markupAmount ?? 0)} markup (${rule}` +
        (markup.ruleName ? ` — ${markup.ruleName}` : "") +
        `)`,
    );
  }

  return lines;
}
