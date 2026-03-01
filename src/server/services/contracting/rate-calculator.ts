import Decimal from "decimal.js";
import { formatSeasonLabel } from "@/lib/utils";

// ── Input Types ──

export interface RateContractData {
  rateBasis: "PER_PERSON" | "PER_ROOM";
  baseRoomTypeId: string;
  baseMealBasisId: string;
  seasons: { id: string; dateFrom: string; dateTo: string }[];
  roomTypes: {
    roomTypeId: string;
    isBase: boolean;
    roomType: { id: string; name: string; code: string };
  }[];
  mealBases: {
    mealBasisId: string;
    isBase: boolean;
    mealBasis: { id: string; name: string; mealCode: string };
  }[];
  baseRates: {
    seasonId: string;
    rate: string | number;
    singleRate: string | number | null;
    doubleRate: string | number | null;
    tripleRate: string | number | null;
  }[];
  supplements: {
    supplementType: string;
    roomTypeId: string | null;
    mealBasisId: string | null;
    forAdults: number | null;
    forChildCategory: string | null;
    forChildBedding: string | null;
    childPosition: number | null;
    valueType: string;
    value: string | number;
    isReduction: boolean;
    perPerson: boolean;
    perNight: boolean;
    label: string | null;
  }[];
  childPolicies: {
    category: string;
    ageFrom: number;
    ageTo: number;
    freeInSharing: boolean;
    maxFreePerRoom: number;
    extraBedAllowed: boolean;
    chargePercentage: number;
  }[];
  specialOffers: {
    id: string;
    name: string;
    offerType: string;
    validFrom: string | null;
    validTo: string | null;
    bookByDate: string | null;
    minimumNights: number | null;
    minimumRooms: number | null;
    advanceBookDays: number | null;
    discountType: string;
    discountValue: string | number;
    stayNights: number | null;
    payNights: number | null;
    bookFromDate: string | null;
    stayDateType: string | null;
    paymentPct: number | null;
    paymentDeadline: string | null;
    roomingListBy: string | null;
    combinable: boolean;
    active: boolean;
  }[];
  seasonSpos?: {
    spoType: string;
    dateFrom: string;
    dateTo: string;
    basePp: string | number | null;
    sglSup: string | number | null;
    thirdAdultRed: string | number | null;
    firstChildPct: string | number | null;
    secondChildPct: string | number | null;
    bookFrom: string | null;
    bookTo: string | null;
    value: string | number | null;
    valueType: string | null;
    active: boolean;
  }[];
}

export interface BookingScenario {
  seasonId: string;
  roomTypeId: string;
  mealBasisId: string;
  adults: number;
  children: { category: string }[];
  extraBed: boolean;
  nights: number;
  bookingDate: string | null;
  checkInDate: string | null;
}

// ── Output Types ──

export interface SupplementLine {
  label: string;
  amount: number;
}

export interface ChildChargeLine {
  category: string;
  position: number;
  amount: number;
  isFree: boolean;
  label: string;
}

export interface OfferDiscountLine {
  offerName: string;
  offerType: string;
  discount: number;
  description: string;
}

export interface RateBreakdown {
  baseRate: number;
  baseRateLabel: string;
  roomTypeSupplement: SupplementLine | null;
  mealSupplement: SupplementLine | null;
  occupancySupplement: SupplementLine | null;
  extraBedSupplement: SupplementLine | null;
  childCharges: ChildChargeLine[];
  adultTotalPerNight: number;
  childTotalPerNight: number;
  totalPerNight: number;
  totalStay: number;
  offerDiscounts: OfferDiscountLine[];
  totalStayBeforeOffers: number;
  totalStayAfterOffers: number;
  nights: number;
  rateBasis: string;
}

export interface RateSheetCell {
  roomTypeId: string;
  roomTypeName: string;
  mealBasisId: string;
  mealBasisName: string;
  seasonId: string;
  seasonLabel: string;
  rate: number;
  breakdown: RateBreakdown;
}

export interface RateSheetData {
  roomTypes: { id: string; name: string; code: string; isBase: boolean }[];
  mealBases: { id: string; name: string; mealCode: string; isBase: boolean }[];
  seasons: { id: string; dateFrom: string; dateTo: string }[];
  cells: RateSheetCell[];
}

// ── Helpers ──

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const CATEGORY_LABELS: Record<string, string> = {
  INFANT: "Infant",
  CHILD: "Child",
  TEEN: "Teen",
};

function applyValue(
  base: Decimal,
  value: Decimal,
  valueType: string,
  isReduction: boolean,
): Decimal {
  const amount =
    valueType === "PERCENTAGE" ? base.times(value).div(100) : value;
  return isReduction ? amount.neg() : amount;
}

function resolveBaseRate(
  contract: RateContractData,
  seasonId: string,
  adults: number,
): { rate: Decimal; label: string } {
  const br = contract.baseRates.find((r) => r.seasonId === seasonId);
  if (!br) return { rate: new Decimal(0), label: "No Base Rate" };

  if (contract.rateBasis === "PER_ROOM") {
    return { rate: new Decimal(br.rate), label: "Base Rate (Per Room)" };
  }

  // PER_PERSON: try named rates first
  if (adults === 1 && br.singleRate != null) {
    return { rate: new Decimal(br.singleRate), label: "Single Rate" };
  }
  if (adults === 2 && br.doubleRate != null) {
    return { rate: new Decimal(br.doubleRate), label: "Double Rate" };
  }
  if (adults === 3 && br.tripleRate != null) {
    return { rate: new Decimal(br.tripleRate), label: "Triple Rate" };
  }
  return { rate: new Decimal(br.rate), label: "Base Rate" };
}

function findSupplement(
  supplements: RateContractData["supplements"],
  type: string,
  match: (s: RateContractData["supplements"][number]) => boolean,
) {
  return supplements.find(
    (s) => s.supplementType === type && match(s),
  );
}

// ── Season SPO Helpers ──

interface SeasonSpoAdjustment {
  label: string;
  amount: number;
}

/**
 * Find applicable Season SPOs for a given night/booking date.
 * RATE_OVERRIDE: replaces the base rate if check-in falls within SPO period.
 * BOOKING_WINDOW: applies discount if booking date is within the window and stay within period.
 * PERCENTAGE: applies percentage adjustment if stay date falls within period.
 */
function findApplicableSpos(
  spos: NonNullable<RateContractData["seasonSpos"]>,
  checkInDate: string | null,
  bookingDate: string | null,
): {
  rateOverride: NonNullable<RateContractData["seasonSpos"]>[number] | null;
  discountSpos: { spo: NonNullable<RateContractData["seasonSpos"]>[number]; label: string }[];
} {
  let rateOverride: NonNullable<RateContractData["seasonSpos"]>[number] | null = null;
  const discountSpos: { spo: NonNullable<RateContractData["seasonSpos"]>[number]; label: string }[] = [];

  for (const spo of spos) {
    if (!spo.active) continue;
    const spoFrom = spo.dateFrom;
    const spoTo = spo.dateTo;

    if (spo.spoType === "RATE_OVERRIDE") {
      if (checkInDate && checkInDate >= spoFrom && checkInDate <= spoTo) {
        rateOverride = spo;
      }
    } else if (spo.spoType === "BOOKING_WINDOW") {
      const inStayPeriod = checkInDate && checkInDate >= spoFrom && checkInDate <= spoTo;
      const inBookWindow = bookingDate && spo.bookFrom && spo.bookTo
        && bookingDate >= spo.bookFrom && bookingDate <= spo.bookTo;
      if (inStayPeriod && inBookWindow) {
        discountSpos.push({ spo, label: `Booking Window SPO (${spo.bookFrom}–${spo.bookTo})` });
      }
    } else if (spo.spoType === "PERCENTAGE") {
      if (checkInDate && checkInDate >= spoFrom && checkInDate <= spoTo) {
        discountSpos.push({ spo, label: `Seasonal Adjustment (${spoFrom}–${spoTo})` });
      }
    }
  }

  return { rateOverride, discountSpos };
}

// ── Special Offer Helpers ──

function differenceInDays(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function isDateInRange(
  date: string | null,
  from: string | null,
  to: string | null,
): boolean {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function applySpecialOffers(
  contract: RateContractData,
  scenario: BookingScenario,
  totalPerNight: number,
  totalStay: number,
): { offerDiscounts: OfferDiscountLine[]; totalStayAfterOffers: number } {
  const offers = contract.specialOffers.filter((o) => o.active);
  const discounts: OfferDiscountLine[] = [];
  let running = new Decimal(totalStay);

  for (const offer of offers) {
    let eligible = true;
    let description = "";
    let discount = new Decimal(0);

    // Skip generic date checks for NORMAL_EBD — handled in its own case
    if (offer.offerType !== "NORMAL_EBD") {
      // Check date validity
      if (!isDateInRange(scenario.checkInDate, offer.validFrom, offer.validTo)) {
        eligible = false;
        description = "Check-in date outside offer period";
      }

      // Check book-by date
      if (eligible && offer.bookByDate && scenario.bookingDate) {
        if (scenario.bookingDate > offer.bookByDate) {
          eligible = false;
          description = `Must book by ${offer.bookByDate}`;
        }
      }
    }

    if (eligible) {
      switch (offer.offerType) {
        case "EARLY_BIRD": {
          if (!scenario.bookingDate || !scenario.checkInDate) {
            eligible = false;
            description = "Booking and check-in dates required";
          } else {
            const days = differenceInDays(scenario.bookingDate, scenario.checkInDate);
            if (days < (offer.advanceBookDays ?? 0)) {
              eligible = false;
              description = `Requires ${offer.advanceBookDays}+ days advance booking (${days} days)`;
            } else {
              description = `${offer.advanceBookDays}+ days advance booking`;
            }
          }
          break;
        }
        case "LONG_STAY": {
          if (scenario.nights < (offer.minimumNights ?? 0)) {
            eligible = false;
            description = `Requires ${offer.minimumNights}+ nights (${scenario.nights} nights)`;
          } else {
            description = `${offer.minimumNights}+ night stay`;
          }
          break;
        }
        case "FREE_NIGHTS": {
          const stay = offer.stayNights ?? 0;
          const pay = offer.payNights ?? 0;
          if (stay > 0 && scenario.nights >= stay) {
            const freeNights = Math.floor(scenario.nights / stay) * (stay - pay);
            discount = new Decimal(totalPerNight).times(freeNights);
            description = `Stay ${stay}, Pay ${pay} (${freeNights} free night${freeNights !== 1 ? "s" : ""})`;
          } else {
            eligible = false;
            description = `Requires ${stay}+ nights (${scenario.nights} nights)`;
          }
          break;
        }
        case "HONEYMOON": {
          description = "Honeymoon package";
          break;
        }
        case "GROUP_DISCOUNT": {
          eligible = false;
          description = `Requires ${offer.minimumRooms}+ rooms`;
          break;
        }
        case "NORMAL_EBD": {
          // 1. Check booking date is within bookFromDate..bookByDate window
          if (!scenario.bookingDate) {
            eligible = false;
            description = "Booking date required";
          } else {
            if (offer.bookFromDate && scenario.bookingDate < offer.bookFromDate) {
              eligible = false;
              description = `Booking date before ${offer.bookFromDate}`;
            }
            if (eligible && offer.bookByDate && scenario.bookingDate > offer.bookByDate) {
              eligible = false;
              description = `Booking date after ${offer.bookByDate}`;
            }
          }

          // 2. Check stay dates based on stayDateType
          if (eligible && scenario.checkInDate) {
            if (offer.stayDateType === "ARRIVAL") {
              if (!isDateInRange(scenario.checkInDate, offer.validFrom, offer.validTo)) {
                eligible = false;
                description = "Arrival date outside stay period";
              }
            } else {
              // COMPLETED: both check-in AND check-out must be within range
              if (!isDateInRange(scenario.checkInDate, offer.validFrom, offer.validTo)) {
                eligible = false;
                description = "Check-in date outside stay period";
              }
              if (eligible) {
                const checkOutDate = addDaysISO(scenario.checkInDate, scenario.nights);
                if (!isDateInRange(checkOutDate, offer.validFrom, offer.validTo)) {
                  eligible = false;
                  description = "Check-out date outside stay period";
                }
              }
            }
          }

          // 3. Build description
          if (eligible) {
            description = `Book ${offer.bookFromDate ?? ""}–${offer.bookByDate ?? ""}, Stay ${offer.stayDateType ?? "COMPLETED"}`;
            if (offer.paymentPct && offer.paymentDeadline) {
              description += ` | Payment: ${offer.paymentPct}% by ${offer.paymentDeadline}`;
            }
          }
          break;
        }
      }
    }

    // Calculate discount for non-FREE_NIGHTS types
    if (eligible && offer.offerType !== "FREE_NIGHTS") {
      const val = new Decimal(offer.discountValue);
      if (offer.discountType === "PERCENTAGE") {
        discount = running.times(val).div(100);
        description += ` (${val.toNumber()}% off)`;
      } else {
        discount = val;
        description += ` (${val.toNumber()} off)`;
      }
    }

    discounts.push({
      offerName: offer.name,
      offerType: offer.offerType,
      discount: eligible ? discount.toDecimalPlaces(4).toNumber() : 0,
      description: eligible ? description : `Not eligible: ${description}`,
    });

    if (eligible && discount.gt(0)) {
      running = running.minus(discount);
    }
  }

  return {
    offerDiscounts: discounts,
    totalStayAfterOffers: running.toDecimalPlaces(4).toNumber(),
  };
}

// ── Main Calculation ──

export function calculateRate(
  contract: RateContractData,
  scenario: BookingScenario,
): RateBreakdown {
  const { seasonId, roomTypeId, mealBasisId, adults, children, extraBed, nights } = scenario;

  // 1. Base rate (may be overridden by Season SPO RATE_OVERRIDE)
  let { rate: baseRate, label: baseRateLabel } = resolveBaseRate(contract, seasonId, adults);

  const spoAdjustments: SeasonSpoAdjustment[] = [];
  if (contract.seasonSpos && contract.seasonSpos.length > 0) {
    const { rateOverride, discountSpos } = findApplicableSpos(
      contract.seasonSpos,
      scenario.checkInDate,
      scenario.bookingDate,
    );

    // Apply RATE_OVERRIDE: replace base rate with SPO rate
    if (rateOverride && rateOverride.basePp != null) {
      const overrideRate = new Decimal(rateOverride.basePp);
      const diff = overrideRate.minus(baseRate);
      spoAdjustments.push({
        label: `Rate Override (${rateOverride.dateFrom}–${rateOverride.dateTo})`,
        amount: diff.toDecimalPlaces(4).toNumber(),
      });
      baseRate = overrideRate;
      baseRateLabel = "SPO Rate Override";
    }

    // Store discount SPOs to apply after supplements
    for (const { spo, label } of discountSpos) {
      if (spo.value != null) {
        // Will be applied after supplements are calculated
        spoAdjustments.push({ label, amount: 0 }); // placeholder, computed below
      }
    }
  }

  // 2. Room type supplement
  let roomTypeSupplement: SupplementLine | null = null;
  if (roomTypeId !== contract.baseRoomTypeId) {
    const sup = findSupplement(
      contract.supplements,
      "ROOM_TYPE",
      (s) => s.roomTypeId === roomTypeId,
    );
    if (sup) {
      let amount = applyValue(baseRate, new Decimal(sup.value), sup.valueType, false);
      if (sup.perPerson && contract.rateBasis === "PER_ROOM") {
        amount = amount.times(adults);
      }
      const rtName = contract.roomTypes.find((rt) => rt.roomTypeId === roomTypeId)?.roomType.name ?? "Room Upgrade";
      roomTypeSupplement = {
        label: rtName,
        amount: amount.toDecimalPlaces(4).toNumber(),
      };
    }
  }

  // 3. Meal supplement
  let mealSupplement: SupplementLine | null = null;
  if (mealBasisId !== contract.baseMealBasisId) {
    const sup = findSupplement(
      contract.supplements,
      "MEAL",
      (s) => s.mealBasisId === mealBasisId,
    );
    if (sup) {
      let amount = applyValue(baseRate, new Decimal(sup.value), sup.valueType, sup.isReduction);
      if (sup.perPerson && contract.rateBasis === "PER_ROOM") {
        amount = amount.times(adults);
      } else if (!sup.perPerson && contract.rateBasis === "PER_PERSON") {
        // perPerson=false on a PER_PERSON contract: divide by adults to get per-person amount
        // Actually, keep it as a flat amount added to the per-night total
      }
      const mbName = contract.mealBases.find((mb) => mb.mealBasisId === mealBasisId)?.mealBasis.name ?? "Meal Upgrade";
      mealSupplement = {
        label: mbName,
        amount: amount.toDecimalPlaces(4).toNumber(),
      };
    }
  }

  // 4. Occupancy supplement
  let occupancySupplement: SupplementLine | null = null;
  if (adults === 1 || adults >= 3) {
    const forAdults = adults === 1 ? 1 : 3;
    const sup = findSupplement(
      contract.supplements,
      "OCCUPANCY",
      (s) => s.forAdults === forAdults,
    );
    if (sup) {
      const amount = applyValue(baseRate, new Decimal(sup.value), sup.valueType, sup.isReduction);
      occupancySupplement = {
        label: adults === 1 ? "Single Supplement" : "3rd Adult Reduction",
        amount: amount.toDecimalPlaces(4).toNumber(),
      };
    }
  }

  // 5. Extra bed supplement
  let extraBedSupplement: SupplementLine | null = null;
  if (extraBed) {
    const sup = findSupplement(
      contract.supplements,
      "EXTRA_BED",
      () => true,
    );
    if (sup) {
      const amount = applyValue(baseRate, new Decimal(sup.value), sup.valueType, false);
      extraBedSupplement = {
        label: "Extra Bed",
        amount: amount.toDecimalPlaces(4).toNumber(),
      };
    }
  }

  // 7. Child charges (from child policy chargePercentage)
  const childCharges: ChildChargeLine[] = [];

  // Track free-in-sharing counts per category
  const freeCounts: Record<string, number> = {};

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const position = i + 1;
    const catLabel = CATEGORY_LABELS[child.category] ?? child.category;
    const posLabel = `${ordinal(position)} Child (${catLabel})`;

    // Find matching child policy by category
    const policy = contract.childPolicies.find((cp) => cp.category === child.category);

    if (policy) {
      // Check free-in-sharing eligibility
      if (policy.freeInSharing) {
        const usedFree = freeCounts[child.category] ?? 0;
        if (usedFree < policy.maxFreePerRoom) {
          freeCounts[child.category] = usedFree + 1;
          childCharges.push({
            category: child.category, position, amount: 0,
            isFree: true, label: `${posLabel} — Free`,
          });
          continue;
        }
      }

      // Charge based on chargePercentage
      const charge = baseRate.times(policy.chargePercentage).div(100);
      childCharges.push({
        category: child.category, position,
        amount: Decimal.max(charge, 0).toDecimalPlaces(4).toNumber(),
        isFree: false, label: policy.chargePercentage === 0 ? `${posLabel} — Free` : `${posLabel} (${policy.chargePercentage}%)`,
      });
    } else {
      // No policy: defaults — INFANT free, TEEN full adult rate, others full rate
      if (child.category === "INFANT") {
        childCharges.push({
          category: child.category, position, amount: 0,
          isFree: true, label: `${posLabel} — Free`,
        });
      } else {
        childCharges.push({
          category: child.category, position,
          amount: baseRate.toDecimalPlaces(4).toNumber(),
          isFree: false, label: `${posLabel} (100%)`,
        });
      }
    }
  }

  // 8. Aggregate
  let adultTotal = baseRate;
  if (roomTypeSupplement) adultTotal = adultTotal.plus(roomTypeSupplement.amount);
  if (mealSupplement) adultTotal = adultTotal.plus(mealSupplement.amount);
  if (occupancySupplement) adultTotal = adultTotal.plus(occupancySupplement.amount);
  if (extraBedSupplement) adultTotal = adultTotal.plus(extraBedSupplement.amount);

  // 8b. Apply BOOKING_WINDOW / PERCENTAGE Season SPO discounts
  if (contract.seasonSpos && contract.seasonSpos.length > 0) {
    const { discountSpos } = findApplicableSpos(
      contract.seasonSpos,
      scenario.checkInDate,
      scenario.bookingDate,
    );
    for (const { spo } of discountSpos) {
      if (spo.value == null) continue;
      const val = new Decimal(spo.value);
      if (spo.valueType === "PERCENTAGE") {
        const reduction = adultTotal.times(val).div(100);
        adultTotal = adultTotal.minus(reduction);
      } else {
        adultTotal = adultTotal.minus(val);
      }
    }
  }

  const adultTotalPerNight = adultTotal.toDecimalPlaces(4).toNumber();
  const childTotalPerNight = childCharges.reduce((sum, c) => sum + c.amount, 0);
  const totalPerNight = new Decimal(adultTotalPerNight).plus(childTotalPerNight).toDecimalPlaces(4).toNumber();
  const totalStay = new Decimal(totalPerNight).times(nights).toDecimalPlaces(4).toNumber();

  // 9. Special offers
  const { offerDiscounts, totalStayAfterOffers } = applySpecialOffers(
    contract,
    scenario,
    totalPerNight,
    totalStay,
  );

  return {
    baseRate: baseRate.toDecimalPlaces(4).toNumber(),
    baseRateLabel,
    roomTypeSupplement,
    mealSupplement,
    occupancySupplement,
    extraBedSupplement,
    childCharges,
    adultTotalPerNight,
    childTotalPerNight,
    totalPerNight,
    totalStay,
    offerDiscounts,
    totalStayBeforeOffers: totalStay,
    totalStayAfterOffers,
    nights,
    rateBasis: contract.rateBasis,
  };
}

// ── Multi-Room Types ──

export interface OccupancyRow {
  id: string;
  roomTypeId: string;
  adults: number;
  children: number;
  infants: number;
  extraBeds: number;
  isDefault: boolean;
  description: string | null;
}

export interface MultiRoomResult {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  occupancyMatch: { adults: number; children: number; infants: number; extraBeds: number };
  breakdown: RateBreakdown;
  roomTotalPerNight: number;       // (adultRate × adults) + childCharges
  totalPerRoom: number;            // roomTotalPerNight × nights
  totalPerRoomAfterOffers: number;
}

export interface MultiRoomResponse {
  seasonId: string;
  seasonLabel: string;
  nights: number;
  resolvedChildren: { dob: string; ageAtCheckIn: number; category: string }[];
  results: MultiRoomResult[];
}

// ── Multi-Room Helpers ──

export function resolveChildCategory(
  dob: string,
  arrivalDate: string,
  childPolicies: RateContractData["childPolicies"],
): { ageAtCheckIn: number; category: string } {
  const birth = new Date(dob);
  const arrival = new Date(arrivalDate);
  let age = arrival.getFullYear() - birth.getFullYear();
  const monthDiff = arrival.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && arrival.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 0) age = 0;

  for (const policy of childPolicies) {
    if (age >= policy.ageFrom && age <= policy.ageTo) {
      return { ageAtCheckIn: age, category: policy.category };
    }
  }
  // Default: if older than all ranges, treat as TEEN; if younger, INFANT
  if (age <= 2) return { ageAtCheckIn: age, category: "INFANT" };
  return { ageAtCheckIn: age, category: "CHILD" };
}

export function detectSeason(
  arrivalDate: string,
  seasons: RateContractData["seasons"],
): { id: string; label: string } | null {
  for (const s of seasons) {
    if (arrivalDate >= s.dateFrom && arrivalDate <= s.dateTo) {
      return { id: s.id, label: formatSeasonLabel(s.dateFrom, s.dateTo) };
    }
  }
  return null;
}

export function calculateMultiRoomRate(
  contract: RateContractData,
  occupancyTables: OccupancyRow[],
  input: {
    arrivalDate: string;
    departureDate: string;
    adults: number;
    childDobs: string[];
    mealBasisId: string;
    extraBed: boolean;
    bookingDate?: string | null;
  },
): MultiRoomResponse {
  // 1. Detect season
  const season = detectSeason(input.arrivalDate, contract.seasons);
  if (!season) {
    return {
      seasonId: "",
      seasonLabel: "No matching season",
      nights: 0,
      resolvedChildren: [],
      results: [],
    };
  }

  // 2. Calculate nights
  const nights = differenceInDays(input.arrivalDate, input.departureDate);
  if (nights <= 0) {
    return {
      seasonId: season.id,
      seasonLabel: season.label,
      nights: 0,
      resolvedChildren: [],
      results: [],
    };
  }

  // 3. Resolve child categories
  const resolvedChildren = input.childDobs.map((dob) => {
    const { ageAtCheckIn, category } = resolveChildCategory(dob, input.arrivalDate, contract.childPolicies);
    return { dob, ageAtCheckIn, category };
  });

  // Count children vs infants
  const childCount = resolvedChildren.filter((c) => c.category === "CHILD" || c.category === "TEEN").length;
  const infantCount = resolvedChildren.filter((c) => c.category === "INFANT").length;
  const extraBeds = input.extraBed ? 1 : 0;

  // 4. For each contract room type, find matching occupancy rows
  const results: MultiRoomResult[] = [];

  for (const crt of contract.roomTypes) {
    const matchingOccupancy = occupancyTables.find(
      (o) =>
        o.roomTypeId === crt.roomTypeId &&
        o.adults === input.adults &&
        o.children === childCount &&
        o.infants === infantCount &&
        o.extraBeds === extraBeds,
    );

    if (!matchingOccupancy) continue;

    // Build children array for the existing calculateRate
    const childrenForCalc: { category: string }[] = resolvedChildren.map((c) => ({
      category: c.category,
    }));

    const breakdown = calculateRate(contract, {
      seasonId: season.id,
      roomTypeId: crt.roomTypeId,
      mealBasisId: input.mealBasisId,
      adults: input.adults,
      children: childrenForCalc,
      extraBed: input.extraBed,
      nights,
      bookingDate: input.bookingDate ?? null,
      checkInDate: input.arrivalDate,
    });

    // For PER_PERSON: adultTotalPerNight is for ONE adult, must multiply by pax
    // For PER_ROOM: adultTotalPerNight is already the room rate
    const roomTotalPerNight = contract.rateBasis === "PER_PERSON"
      ? new Decimal(breakdown.adultTotalPerNight).times(input.adults).plus(breakdown.childTotalPerNight).toDecimalPlaces(4).toNumber()
      : breakdown.totalPerNight;

    const totalPerRoom = new Decimal(roomTotalPerNight).times(nights).toDecimalPlaces(4).toNumber();

    // Scale offer discounts to room level
    // breakdown.totalStay is per-person level; compute ratio to apply to room total
    let totalPerRoomAfterOffers = totalPerRoom;
    if (breakdown.totalStay > 0 && breakdown.totalStayAfterOffers !== breakdown.totalStay) {
      const discountRatio = new Decimal(breakdown.totalStayAfterOffers).div(breakdown.totalStay);
      totalPerRoomAfterOffers = new Decimal(totalPerRoom).times(discountRatio).toDecimalPlaces(4).toNumber();
    }

    results.push({
      roomTypeId: crt.roomTypeId,
      roomTypeName: crt.roomType.name,
      roomTypeCode: crt.roomType.code,
      occupancyMatch: {
        adults: matchingOccupancy.adults,
        children: matchingOccupancy.children,
        infants: matchingOccupancy.infants,
        extraBeds: matchingOccupancy.extraBeds,
      },
      breakdown,
      roomTotalPerNight,
      totalPerRoom,
      totalPerRoomAfterOffers,
    });
  }

  // Sort by total ascending
  results.sort((a, b) => a.totalPerRoomAfterOffers - b.totalPerRoomAfterOffers);

  return {
    seasonId: season.id,
    seasonLabel: season.label,
    nights,
    resolvedChildren,
    results,
  };
}

// ── Full Rate Grid Types ──

export interface OccupancyVariant {
  label: string;       // "SGL", "DBL", "TPL", "2+1C", "2+2C"
  adults: number;
  children: { category: string }[];
  extraBed: boolean;
}

export interface FullRateGridCell {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  roomTypeSuppLabel: string;
  seasonId: string;
  seasonLabel: string;
  mealBasisId: string;
  mealBasisName: string;
  mealCode: string;
  mealSuppLabel: string;
  occupancyLabel: string;
  adultRate: number;
  childRate: number;
  totalPerNight: number;
  breakdown: RateBreakdown;
}

export interface ChildRateGridCell {
  category: string;
  ageRange: string;
  bedding: string;
  mealBasisId: string;
  mealBasisName: string;
  seasonId: string;
  rate: number;
  isFree: boolean;
}

export interface FullRateGridData {
  roomTypes: { id: string; name: string; code: string; isBase: boolean; suppLabel: string }[];
  mealBases: { id: string; name: string; mealCode: string; isBase: boolean; suppLabel: string }[];
  seasons: { id: string; dateFrom: string; dateTo: string }[];
  occupancyVariants: OccupancyVariant[];
  cells: FullRateGridCell[];
  childRates: ChildRateGridCell[];
  rateBasis: string;
}

// ── Full Rate Grid ──

export function computeFullRateGrid(contract: RateContractData): FullRateGridData {
  // 1. Build occupancy variants
  const variants: OccupancyVariant[] = [
    { label: "SGL", adults: 1, children: [], extraBed: false },
    { label: "DBL", adults: 2, children: [], extraBed: false },
    { label: "TPL", adults: 3, children: [], extraBed: false },
  ];

  // Add child combos from childPolicies
  const childCategory = contract.childPolicies.find((cp) => cp.category === "CHILD");
  if (childCategory) {
    variants.push(
      { label: "2+1C", adults: 2, children: [{ category: "CHILD" }], extraBed: false },
      { label: "2+2C", adults: 2, children: [{ category: "CHILD" }, { category: "CHILD" }], extraBed: false },
    );
  }

  // 2. Compute supplement labels for room types (using first season as reference)
  const refSeasonId = contract.seasons[0]?.id ?? "";
  const baseMealId = contract.baseMealBasisId;

  function computeRoomSuppLabel(rt: RateContractData["roomTypes"][number]): string {
    if (rt.isBase) return "(base)";
    const sup = contract.supplements.find(
      (s) => s.supplementType === "ROOM_TYPE" && s.roomTypeId === rt.roomTypeId,
    );
    if (!sup) return "";
    const val = sup.valueType === "PERCENTAGE"
      ? `${sup.value}%`
      : `$${Number(sup.value).toFixed(0)}`;
    return `(+${val})`;
  }

  function computeMealSuppLabel(mb: RateContractData["mealBases"][number]): string {
    if (mb.isBase) return "(base)";
    const sup = contract.supplements.find(
      (s) => s.supplementType === "MEAL" && s.mealBasisId === mb.mealBasisId,
    );
    if (!sup) return "";
    const prefix = sup.isReduction ? "(-" : "(+";
    const val = sup.valueType === "PERCENTAGE"
      ? `${sup.value}%`
      : `$${Number(sup.value).toFixed(0)}`;
    return `${prefix}${val})`;
  }

  // 3. Compute cells for each combination
  const cells: FullRateGridCell[] = [];

  for (const rt of contract.roomTypes) {
    const rtSuppLabel = computeRoomSuppLabel(rt);
    for (const variant of variants) {
      for (const mb of contract.mealBases) {
        const mbSuppLabel = computeMealSuppLabel(mb);
        for (const season of contract.seasons) {
          const breakdown = calculateRate(contract, {
            seasonId: season.id,
            roomTypeId: rt.roomTypeId,
            mealBasisId: mb.mealBasisId,
            adults: variant.adults,
            children: variant.children,
            extraBed: variant.extraBed,
            nights: 1,
            bookingDate: null,
            checkInDate: null,
          });

          cells.push({
            roomTypeId: rt.roomTypeId,
            roomTypeName: rt.roomType.name,
            roomTypeCode: rt.roomType.code,
            roomTypeSuppLabel: rtSuppLabel,
            seasonId: season.id,
            seasonLabel: formatSeasonLabel(season.dateFrom, season.dateTo),
            mealBasisId: mb.mealBasisId,
            mealBasisName: mb.mealBasis.name,
            mealCode: mb.mealBasis.mealCode,
            mealSuppLabel: mbSuppLabel,
            occupancyLabel: variant.label,
            adultRate: breakdown.adultTotalPerNight,
            childRate: breakdown.childTotalPerNight,
            totalPerNight: breakdown.totalPerNight,
            breakdown,
          });
        }
      }
    }
  }

  // 4. Build child rates section
  const childRates: ChildRateGridCell[] = [];

  for (const policy of contract.childPolicies) {
    const beddingOptions: { bedding: string; extraBed: boolean }[] = [
      { bedding: "Sharing", extraBed: false },
    ];
    if (policy.extraBedAllowed) {
      beddingOptions.push({ bedding: "Extra Bed", extraBed: true });
    }

    for (const { bedding, extraBed } of beddingOptions) {
      for (const mb of contract.mealBases) {
        for (const season of contract.seasons) {
          // Calculate with 2 adults + 1 child to extract child charge
          const breakdown = calculateRate(contract, {
            seasonId: season.id,
            roomTypeId: contract.baseRoomTypeId,
            mealBasisId: mb.mealBasisId,
            adults: 2,
            children: [{ category: policy.category }],
            extraBed,
            nights: 1,
            bookingDate: null,
            checkInDate: null,
          });

          const childCharge = breakdown.childCharges[0];
          const isFree = policy.category === "INFANT" && policy.freeInSharing && bedding === "Sharing";

          childRates.push({
            category: policy.category,
            ageRange: `${policy.ageFrom}-${policy.ageTo}`,
            bedding,
            mealBasisId: mb.mealBasisId,
            mealBasisName: mb.mealBasis.name,
            seasonId: season.id,
            rate: childCharge?.amount ?? 0,
            isFree: isFree || (childCharge?.isFree ?? false),
          });
        }
      }
    }
  }

  return {
    roomTypes: contract.roomTypes.map((rt) => ({
      id: rt.roomTypeId,
      name: rt.roomType.name,
      code: rt.roomType.code,
      isBase: rt.isBase,
      suppLabel: computeRoomSuppLabel(rt),
    })),
    mealBases: contract.mealBases.map((mb) => ({
      id: mb.mealBasisId,
      name: mb.mealBasis.name,
      mealCode: mb.mealBasis.mealCode,
      isBase: mb.isBase,
      suppLabel: computeMealSuppLabel(mb),
    })),
    seasons: contract.seasons.map((s) => ({
      id: s.id,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
    })),
    occupancyVariants: variants,
    cells,
    childRates,
    rateBasis: contract.rateBasis,
  };
}

// ── Rate Sheet ──

export function computeRateSheet(contract: RateContractData): RateSheetData {
  const cells: RateSheetCell[] = [];

  for (const rt of contract.roomTypes) {
    for (const mb of contract.mealBases) {
      for (const season of contract.seasons) {
        const breakdown = calculateRate(contract, {
          seasonId: season.id,
          roomTypeId: rt.roomTypeId,
          mealBasisId: mb.mealBasisId,
          adults: 2,
          children: [],
          extraBed: false,
          nights: 1,
          bookingDate: null,
          checkInDate: null,
        });

        cells.push({
          roomTypeId: rt.roomTypeId,
          roomTypeName: rt.roomType.name,
          mealBasisId: mb.mealBasisId,
          mealBasisName: mb.mealBasis.name,
          seasonId: season.id,
          seasonLabel: formatSeasonLabel(season.dateFrom, season.dateTo),
          rate: breakdown.totalPerNight,
          breakdown,
        });
      }
    }
  }

  return {
    roomTypes: contract.roomTypes.map((rt) => ({
      id: rt.roomTypeId,
      name: rt.roomType.name,
      code: rt.roomType.code,
      isBase: rt.isBase,
    })),
    mealBases: contract.mealBases.map((mb) => ({
      id: mb.mealBasisId,
      name: mb.mealBasis.name,
      mealCode: mb.mealBasis.mealCode,
      isBase: mb.isBase,
    })),
    seasons: contract.seasons.map((s) => ({
      id: s.id,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
    })),
    cells,
  };
}
