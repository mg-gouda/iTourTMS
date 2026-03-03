import type { Decimal } from "decimal.js";
import type {
  RateBasis,
  SupplementValueType,
  OfferType,
  ChildAgeCategory,
  AllocationBasis,
} from "@prisma/client";

// ── Types ────────────────────────────────────────────────

export interface SeasonNight {
  date: Date;
  seasonId: string;
}

export interface BaseRateRow {
  seasonId: string;
  rate: Decimal;
  singleRate: Decimal | null;
  doubleRate: Decimal | null;
  tripleRate: Decimal | null;
}

export interface SupplementRow {
  seasonId: string | null;
  supplementType: string;
  roomTypeId: string | null;
  mealBasisId: string | null;
  forAdults: number | null;
  forChildCategory: ChildAgeCategory | null;
  valueType: SupplementValueType;
  value: Decimal;
  isReduction: boolean;
  perPerson: boolean;
  perNight: boolean;
}

export interface OfferRow {
  id: string;
  name: string;
  offerType: OfferType;
  discountType: SupplementValueType;
  discountValue: Decimal;
  validFrom: Date | null;
  validTo: Date | null;
  bookByDate: Date | null;
  minimumNights: number | null;
  advanceBookDays: number | null;
  stayNights: number | null;
  payNights: number | null;
  combinable: boolean;
  active: boolean;
  tiers: { thresholdValue: number; discountType: SupplementValueType; discountValue: Decimal }[];
}

export interface ChildPolicyRow {
  category: ChildAgeCategory;
  ageFrom: number;
  ageTo: number;
  chargePercentage: number;
  freeInSharing: boolean;
  mealsIncluded: boolean;
}

export interface AllotmentRow {
  seasonId: string | null;
  roomTypeId: string;
  basis: AllocationBasis;
  totalRooms: number;
  soldRooms: number;
}

export interface StopSaleRow {
  roomTypeId: string | null;
  dateFrom: Date;
  dateTo: Date;
}

export interface SpecialMealRow {
  dateFrom: Date;
  dateTo: Date;
  mandatory: boolean;
  adultPrice: Decimal;
  childPrice: Decimal | null;
  excludedMealBases: string | null;
}

// ── Helpers ──────────────────────────────────────────────

function toNum(d: Decimal | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

/** Map each night of a stay to its season */
export function mapNightsToSeasons(
  checkIn: Date,
  checkOut: Date,
  seasons: { id: string; dateFrom: Date; dateTo: Date }[],
): SeasonNight[] {
  const nights: SeasonNight[] = [];
  const current = new Date(checkIn);

  while (current < checkOut) {
    const nightDate = new Date(current);
    const season = seasons.find(
      (s) => nightDate >= new Date(s.dateFrom) && nightDate <= new Date(s.dateTo),
    );
    if (season) {
      nights.push({ date: nightDate, seasonId: season.id });
    }
    current.setDate(current.getDate() + 1);
  }

  return nights;
}

/** Check if a date range overlaps with a stop sale */
export function isStopSold(
  checkIn: Date,
  checkOut: Date,
  roomTypeId: string,
  stopSales: StopSaleRow[],
): boolean {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);

  return stopSales.some((ss) => {
    if (ss.roomTypeId && ss.roomTypeId !== roomTypeId) return false;
    const from = new Date(ss.dateFrom);
    const to = new Date(ss.dateTo);
    return ci <= to && co > from;
  });
}

/** Get allotment info for a room type */
export function getAllotmentInfo(
  roomTypeId: string,
  seasonNights: SeasonNight[],
  allotments: AllotmentRow[],
): { available: boolean; status: "available" | "on_request" | "limited" | "sold_out"; remaining: number } {
  const seasonIds = [...new Set(seasonNights.map((n) => n.seasonId))];

  let minRemaining = Infinity;
  let hasOnRequest = false;

  for (const sid of seasonIds) {
    const allot = allotments.find(
      (a) => a.roomTypeId === roomTypeId && (a.seasonId === sid || a.seasonId === null),
    );

    if (!allot) {
      // No allotment = freesale by default
      continue;
    }

    if (allot.basis === "FREESALE") continue;
    if (allot.basis === "ON_REQUEST") {
      hasOnRequest = true;
      continue;
    }

    const remaining = allot.totalRooms - allot.soldRooms;
    minRemaining = Math.min(minRemaining, remaining);
  }

  if (minRemaining <= 0 && minRemaining !== Infinity) {
    return { available: false, status: "sold_out", remaining: 0 };
  }

  if (hasOnRequest) {
    return { available: true, status: "on_request", remaining: minRemaining === Infinity ? 99 : minRemaining };
  }

  if (minRemaining !== Infinity && minRemaining <= 5) {
    return { available: true, status: "limited", remaining: minRemaining };
  }

  return { available: true, status: "available", remaining: minRemaining === Infinity ? 99 : minRemaining };
}

/** Calculate base rate for a stay */
export function calculateBaseRate(
  seasonNights: SeasonNight[],
  baseRates: BaseRateRow[],
  rateBasis: RateBasis,
  adults: number,
): number {
  let total = 0;

  for (const night of seasonNights) {
    const rate = baseRates.find((r) => r.seasonId === night.seasonId);
    if (!rate) continue;

    if (rateBasis === "PER_PERSON") {
      total += toNum(rate.rate) * adults;
    } else {
      // PER_ROOM: use occupancy-specific rates when available
      if (adults === 1 && rate.singleRate) {
        total += toNum(rate.singleRate);
      } else if (adults === 2 && rate.doubleRate) {
        total += toNum(rate.doubleRate);
      } else if (adults === 3 && rate.tripleRate) {
        total += toNum(rate.tripleRate);
      } else {
        total += toNum(rate.rate);
      }
    }
  }

  return total;
}

/** Calculate room type supplement */
export function calculateRoomTypeSupplement(
  seasonNights: SeasonNight[],
  supplements: SupplementRow[],
  roomTypeId: string,
  baseRoomTypeId: string,
  adults: number,
): number {
  if (roomTypeId === baseRoomTypeId) return 0;

  let total = 0;
  for (const night of seasonNights) {
    const sup = supplements.find(
      (s) =>
        s.supplementType === "ROOM_TYPE" &&
        s.roomTypeId === roomTypeId &&
        (s.seasonId === night.seasonId || s.seasonId === null),
    );
    if (!sup) continue;

    let amount = toNum(sup.value);
    if (sup.isReduction) amount = -amount;
    if (sup.perPerson) amount *= adults;
    total += amount;
  }

  return total;
}

/** Calculate meal supplement (upgrade from base meal) */
export function calculateMealSupplement(
  seasonNights: SeasonNight[],
  supplements: SupplementRow[],
  mealBasisId: string,
  baseMealBasisId: string,
  adults: number,
): number {
  if (mealBasisId === baseMealBasisId) return 0;

  let total = 0;
  for (const night of seasonNights) {
    const sup = supplements.find(
      (s) =>
        s.supplementType === "MEAL" &&
        s.mealBasisId === mealBasisId &&
        (s.seasonId === night.seasonId || s.seasonId === null),
    );
    if (!sup) continue;

    let amount = toNum(sup.value);
    if (sup.isReduction) amount = -amount;
    if (sup.perPerson) amount *= adults;
    total += amount;
  }

  return total;
}

/** Calculate child charge based on policies */
export function calculateChildCharge(
  childAge: number,
  childPolicies: ChildPolicyRow[],
  adultRatePerNight: number,
  nights: number,
): { charge: number; category: string; freeInSharing: boolean } {
  // Find matching policy by age
  const policy = childPolicies.find(
    (p) => childAge >= p.ageFrom && childAge <= p.ageTo,
  );

  if (!policy) {
    // No matching policy — charge full adult rate
    return { charge: adultRatePerNight * nights, category: "ADULT", freeInSharing: false };
  }

  if (policy.freeInSharing) {
    return { charge: 0, category: policy.category, freeInSharing: true };
  }

  const charge = (adultRatePerNight * nights * policy.chargePercentage) / 100;
  return { charge, category: policy.category, freeInSharing: false };
}

/** Calculate special meals charge */
export function calculateSpecialMeals(
  checkIn: Date,
  checkOut: Date,
  specialMeals: SpecialMealRow[],
  mealCode: string,
  adults: number,
  childAges: number[],
): number {
  let total = 0;

  for (const meal of specialMeals) {
    if (!meal.mandatory) continue;

    // Check if excluded meal basis
    if (meal.excludedMealBases) {
      const excluded = meal.excludedMealBases.split(",").map((s) => s.trim());
      if (excluded.includes(mealCode)) continue;
    }

    // Count overlapping nights
    const mealFrom = new Date(meal.dateFrom);
    const mealTo = new Date(meal.dateTo);
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const overlapStart = mealFrom > ci ? mealFrom : ci;
    const overlapEnd = mealTo < co ? mealTo : co;

    if (overlapStart > overlapEnd) continue;

    // Count nights
    const days =
      Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    total += toNum(meal.adultPrice) * adults * days;
    for (const age of childAges) {
      if (age < 2) {
        // Infant — use infant price or skip
      } else if (age < 12) {
        total += toNum(meal.childPrice) * days;
      } else {
        total += toNum(meal.adultPrice) * days;
      }
    }
  }

  return total;
}

/** Apply best special offer to a total */
export function applyBestOffer(
  totalBeforeOffer: number,
  offers: OfferRow[],
  checkIn: Date,
  nights: number,
): { discountedTotal: number; appliedOffer: { id: string; name: string; type: OfferType; saving: number } | null } {
  const today = new Date();
  let bestSaving = 0;
  let bestOffer: OfferRow | null = null;

  for (const offer of offers) {
    if (!offer.active) continue;

    // Check date validity
    if (offer.validFrom && new Date(checkIn) < new Date(offer.validFrom)) continue;
    if (offer.validTo && new Date(checkIn) > new Date(offer.validTo)) continue;
    if (offer.bookByDate && today > new Date(offer.bookByDate)) continue;
    if (offer.minimumNights && nights < offer.minimumNights) continue;

    // Check advance booking
    if (offer.advanceBookDays) {
      const daysUntilCheckIn = Math.floor(
        (new Date(checkIn).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilCheckIn < offer.advanceBookDays) continue;
    }

    let saving = 0;

    if (offer.offerType === "FREE_NIGHTS" && offer.stayNights && offer.payNights && nights >= offer.stayNights) {
      // Stay X, pay Y — saving is proportional
      const freeNights = offer.stayNights - offer.payNights;
      const cycles = Math.floor(nights / offer.stayNights);
      const pricePerNight = totalBeforeOffer / nights;
      saving = cycles * freeNights * pricePerNight;
    } else if (offer.tiers.length > 0) {
      // Tiered discount — find best matching tier
      const daysUntilCheckIn = Math.floor(
        (new Date(checkIn).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      const sortedTiers = [...offer.tiers].sort((a, b) => b.thresholdValue - a.thresholdValue);
      const matchingTier = sortedTiers.find((t) => daysUntilCheckIn >= t.thresholdValue || nights >= t.thresholdValue);

      if (matchingTier) {
        if (matchingTier.discountType === "PERCENTAGE") {
          saving = (totalBeforeOffer * toNum(matchingTier.discountValue)) / 100;
        } else {
          saving = toNum(matchingTier.discountValue) * nights;
        }
      }
    } else {
      // Simple discount
      if (offer.discountType === "PERCENTAGE") {
        saving = (totalBeforeOffer * toNum(offer.discountValue)) / 100;
      } else {
        saving = toNum(offer.discountValue) * nights;
      }
    }

    if (saving > bestSaving) {
      bestSaving = saving;
      bestOffer = offer;
    }
  }

  if (bestOffer && bestSaving > 0) {
    return {
      discountedTotal: Math.max(0, totalBeforeOffer - bestSaving),
      appliedOffer: {
        id: bestOffer.id,
        name: bestOffer.name,
        type: bestOffer.offerType,
        saving: Math.round(bestSaving * 100) / 100,
      },
    };
  }

  return { discountedTotal: totalBeforeOffer, appliedOffer: null };
}
