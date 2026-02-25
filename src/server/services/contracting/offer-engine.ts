/**
 * Offer eligibility evaluation and combinability engine.
 * Extracted from the special-offer router for reuse by
 * rate-verification simulate and the standalone combinability endpoint.
 */

export interface OfferInput {
  id: string;
  name: string;
  offerType: string;
  discountType: string;
  discountValue: number | { toString(): string };
  combinable: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  bookByDate: Date | null;
  bookFromDate: Date | null;
  advanceBookDays: number | null;
  minimumNights: number | null;
  minimumRooms: number | null;
  stayNights: number | null;
  payNights: number | null;
  tiers: {
    id: string;
    thresholdValue: number;
    discountType: string;
    discountValue: number | { toString(): string };
  }[];
}

export interface OfferResult {
  offerId: string;
  offerName: string;
  offerType: string;
  eligible: boolean;
  reason: string | null;
  discountType: string;
  discountValue: number;
  tierId: string | null;
  tierThreshold: number | null;
  combinable: boolean;
}

export interface EvaluateParams {
  checkInDate: Date;
  bookingDate: Date;
  nights: number;
  rooms: number;
}

/**
 * Evaluate a single offer's eligibility given booking parameters.
 */
export function evaluateOffer(
  offer: OfferInput,
  params: EvaluateParams,
): OfferResult {
  const { checkInDate, bookingDate, nights, rooms } = params;
  const advanceDays = Math.floor(
    (checkInDate.getTime() - bookingDate.getTime()) / 86400000,
  );

  let eligible = true;
  let reason: string | null = null;
  let appliedDiscountType = offer.discountType;
  let appliedDiscountValue = Number(offer.discountValue);
  let tierId: string | null = null;
  let tierThreshold: number | null = null;

  // Check validity period
  if (offer.validFrom && checkInDate < new Date(offer.validFrom)) {
    eligible = false;
    reason = `Check-in before valid start (${offer.validFrom.toISOString().slice(0, 10)})`;
  }
  if (eligible && offer.validTo && checkInDate > new Date(offer.validTo)) {
    eligible = false;
    reason = `Check-in after valid end (${offer.validTo.toISOString().slice(0, 10)})`;
  }

  // Check book-by date
  if (eligible && offer.bookByDate && bookingDate > new Date(offer.bookByDate)) {
    eligible = false;
    reason = `Booked after deadline (${offer.bookByDate.toISOString().slice(0, 10)})`;
  }

  // Check booking window
  if (eligible && offer.bookFromDate && bookingDate < new Date(offer.bookFromDate)) {
    eligible = false;
    reason = `Booked before booking window opens`;
  }

  // Check advance booking days
  if (eligible && offer.advanceBookDays && advanceDays < offer.advanceBookDays) {
    eligible = false;
    reason = `Needs ${offer.advanceBookDays}+ days advance (got ${advanceDays})`;
  }

  // Check minimum nights
  if (eligible && offer.minimumNights && nights < offer.minimumNights) {
    eligible = false;
    reason = `Needs ${offer.minimumNights}+ nights (got ${nights})`;
  }

  // Check minimum rooms
  if (eligible && offer.minimumRooms && rooms < offer.minimumRooms) {
    eligible = false;
    reason = `Needs ${offer.minimumRooms}+ rooms (got ${rooms})`;
  }

  // Check free nights threshold
  if (
    eligible &&
    offer.offerType === "FREE_NIGHTS" &&
    offer.stayNights &&
    nights < offer.stayNights
  ) {
    eligible = false;
    reason = `Needs ${offer.stayNights}+ nights for free night (got ${nights})`;
  }

  // Apply tier-based discount (best matching tier wins)
  if (eligible && offer.tiers.length > 0) {
    const thresholdField =
      offer.offerType === "EARLY_BIRD" ? advanceDays : nights;
    const matchingTier = offer.tiers.find(
      (t) => thresholdField >= t.thresholdValue,
    );
    if (matchingTier) {
      appliedDiscountType = matchingTier.discountType;
      appliedDiscountValue = Number(matchingTier.discountValue);
      tierId = matchingTier.id;
      tierThreshold = matchingTier.thresholdValue;
    } else {
      eligible = false;
      reason = `No matching tier (threshold not met)`;
    }
  }

  return {
    offerId: offer.id,
    offerName: offer.name,
    offerType: offer.offerType,
    eligible,
    reason,
    discountType: appliedDiscountType,
    discountValue: appliedDiscountValue,
    tierId,
    tierThreshold,
    combinable: offer.combinable,
  };
}

/**
 * Evaluate all offers and compute stacking/combinability.
 */
export function evaluateCombinability(
  offers: OfferInput[],
  params: EvaluateParams,
) {
  const results = offers.map((o) => evaluateOffer(o, params));

  const eligibleOffers = results.filter((r) => r.eligible);
  const combinableOffers = eligibleOffers.filter((r) => r.combinable);
  const nonCombinableOffers = eligibleOffers.filter((r) => !r.combinable);

  const bestNonCombinable =
    nonCombinableOffers.length > 0
      ? nonCombinableOffers.reduce((best, curr) =>
          curr.discountValue > best.discountValue ? curr : best,
        )
      : null;

  return {
    offers: results,
    stackedOffers: combinableOffers.map((o) => o.offerId),
    bestNonCombinableOffer: bestNonCombinable?.offerId ?? null,
    summary: {
      totalOffers: offers.length,
      eligible: eligibleOffers.length,
      combinable: combinableOffers.length,
      nonCombinable: nonCombinableOffers.length,
    },
  };
}
