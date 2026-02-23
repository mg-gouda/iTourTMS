import Decimal from "decimal.js";

// ── Input Types ──

export interface RateContractData {
  rateBasis: "PER_PERSON" | "PER_ROOM";
  baseRoomTypeId: string;
  baseMealBasisId: string;
  seasons: { id: string; name: string; code: string }[];
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
    seasonId: string;
    supplementType: string;
    roomTypeId: string | null;
    mealBasisId: string | null;
    forAdults: number | null;
    forChildCategory: string | null;
    forChildBedding: string | null;
    valueType: string;
    value: string | number;
    isReduction: boolean;
    perPerson: boolean;
    perNight: boolean;
    label: string | null;
  }[];
  childPolicies: {
    category: string;
    freeInSharing: boolean;
    maxFreePerRoom: number;
    extraBedAllowed: boolean;
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
    combinable: boolean;
    active: boolean;
  }[];
}

export interface BookingScenario {
  seasonId: string;
  roomTypeId: string;
  mealBasisId: string;
  adults: number;
  children: { category: string; bedding: string }[];
  extraBed: boolean;
  viewLabel: string | null;
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
  bedding: string;
  amount: number;
  isFree: boolean;
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
  viewSupplement: SupplementLine | null;
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
  seasonName: string;
  rate: number;
}

export interface RateSheetData {
  roomTypes: { id: string; name: string; code: string; isBase: boolean }[];
  mealBases: { id: string; name: string; mealCode: string; isBase: boolean }[];
  seasons: { id: string; name: string; code: string }[];
  cells: RateSheetCell[];
  viewLabels: string[];
}

// ── Helpers ──

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
  seasonId: string,
  type: string,
  match: (s: RateContractData["supplements"][number]) => boolean,
) {
  return supplements.find(
    (s) => s.seasonId === seasonId && s.supplementType === type && match(s),
  );
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
  const { seasonId, roomTypeId, mealBasisId, adults, children, extraBed, viewLabel, nights } = scenario;

  // 1. Base rate
  const { rate: baseRate, label: baseRateLabel } = resolveBaseRate(contract, seasonId, adults);

  // 2. Room type supplement
  let roomTypeSupplement: SupplementLine | null = null;
  if (roomTypeId !== contract.baseRoomTypeId) {
    const sup = findSupplement(
      contract.supplements,
      seasonId,
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
      seasonId,
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
      seasonId,
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

  // 5. View supplement
  let viewSupplement: SupplementLine | null = null;
  if (viewLabel) {
    const sup = findSupplement(
      contract.supplements,
      seasonId,
      "VIEW",
      (s) => s.label === viewLabel,
    );
    if (sup) {
      let amount = applyValue(baseRate, new Decimal(sup.value), sup.valueType, false);
      if (sup.perPerson && contract.rateBasis === "PER_ROOM") {
        amount = amount.times(adults);
      }
      viewSupplement = {
        label: viewLabel,
        amount: amount.toDecimalPlaces(4).toNumber(),
      };
    }
  }

  // 6. Extra bed supplement
  let extraBedSupplement: SupplementLine | null = null;
  if (extraBed) {
    const sup = findSupplement(
      contract.supplements,
      seasonId,
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

  // 7. Child charges
  const childCharges: ChildChargeLine[] = [];
  const freeCounters: Record<string, number> = {};

  for (const child of children) {
    const policy = contract.childPolicies.find((p) => p.category === child.category);
    const counterKey = child.category;

    // Check free-in-sharing
    let isFree = false;
    if (
      policy &&
      policy.freeInSharing &&
      child.bedding === "SHARING_WITH_PARENTS"
    ) {
      const used = freeCounters[counterKey] ?? 0;
      if (used < policy.maxFreePerRoom) {
        isFree = true;
        freeCounters[counterKey] = used + 1;
      }
    }

    if (isFree) {
      childCharges.push({
        category: child.category,
        bedding: child.bedding,
        amount: 0,
        isFree: true,
      });
    } else {
      const sup = findSupplement(
        contract.supplements,
        seasonId,
        "CHILD",
        (s) =>
          s.forChildCategory === child.category &&
          s.forChildBedding === child.bedding,
      );
      const amount = sup
        ? applyValue(baseRate, new Decimal(sup.value), sup.valueType, false)
            .toDecimalPlaces(4)
            .toNumber()
        : 0;
      childCharges.push({
        category: child.category,
        bedding: child.bedding,
        amount,
        isFree: false,
      });
    }
  }

  // 8. Aggregate
  let adultTotal = baseRate;
  if (roomTypeSupplement) adultTotal = adultTotal.plus(roomTypeSupplement.amount);
  if (mealSupplement) adultTotal = adultTotal.plus(mealSupplement.amount);
  if (occupancySupplement) adultTotal = adultTotal.plus(occupancySupplement.amount);
  if (viewSupplement) adultTotal = adultTotal.plus(viewSupplement.amount);
  if (extraBedSupplement) adultTotal = adultTotal.plus(extraBedSupplement.amount);

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
    viewSupplement,
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
          viewLabel: null,
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
          seasonName: season.name,
          rate: breakdown.totalPerNight,
        });
      }
    }
  }

  // Collect distinct view labels
  const viewLabels = [
    ...new Set(
      contract.supplements
        .filter((s) => s.supplementType === "VIEW" && s.label)
        .map((s) => s.label!),
    ),
  ];

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
      name: s.name,
      code: s.code,
    })),
    cells,
    viewLabels,
  };
}
