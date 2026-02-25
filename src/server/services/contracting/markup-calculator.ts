// Decimal-like type (Prisma Decimal or string with toString)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarkupRuleData {
  id: string;
  name: string;
  markupType: string; // PERCENTAGE | FIXED_PER_NIGHT | FIXED_PER_BOOKING
  value: string; // Decimal as string
  contractId: string | null;
  hotelId: string | null;
  destinationId: string | null;
  marketId: string | null;
  tourOperatorId: string | null;
  priority: number;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
}

export interface ResolveContext {
  contractId: string;
  hotelId: string;
  destinationId: string | null;
  marketId: string | null;
  tourOperatorId: string;
  date?: string; // optional date for validity check
}

export interface TariffRateEntry {
  seasonId: string;
  seasonName: string;
  seasonCode: string;
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  mealBasisId: string;
  mealBasisName: string;
  mealCode: string;
  baseRate: number;
  markup: number;
  sellingRate: number;
  markupType: string;
  markupValue: number;
  perNight: boolean;
}

export interface TariffData {
  contractId: string;
  contractName: string;
  contractCode: string;
  hotelName: string;
  tourOperatorName: string;
  tourOperatorCode: string;
  markupRuleName: string | null;
  markupType: string;
  markupValue: number;
  currencyCode: string;
  rateBasis: string;
  rates: TariffRateEntry[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Resolve the best-matching markup rule using hierarchy:
//   contract > hotel > destination > global
// Most-specific scope wins; priority breaks ties within the same specificity.
// ---------------------------------------------------------------------------

export function resolveMarkupRule(
  rules: MarkupRuleData[],
  ctx: ResolveContext,
): MarkupRuleData | null {
  // Filter active rules, optionally filter by date
  const candidates = rules.filter((r) => {
    if (!r.active) return false;
    if (ctx.date) {
      if (r.validFrom && ctx.date < r.validFrom) return false;
      if (r.validTo && ctx.date > r.validTo) return false;
    }
    return true;
  });

  // Score each rule by specificity (more specific = higher score)
  function specificity(r: MarkupRuleData): number {
    let score = 0;
    if (r.contractId === ctx.contractId) score += 100;
    else if (r.contractId) return -1; // wrong contract scope

    if (r.hotelId === ctx.hotelId) score += 50;
    else if (r.hotelId) return -1; // wrong hotel scope

    if (r.destinationId && ctx.destinationId === r.destinationId) score += 25;
    else if (r.destinationId) return -1;

    if (r.marketId && ctx.marketId === r.marketId) score += 12;
    else if (r.marketId) return -1;

    if (r.tourOperatorId === ctx.tourOperatorId) score += 6;
    else if (r.tourOperatorId) return -1;

    return score;
  }

  let best: MarkupRuleData | null = null;
  let bestScore = -1;

  for (const rule of candidates) {
    const s = specificity(rule);
    if (s < 0) continue; // scope mismatch

    // More-specific scope wins first; priority breaks ties within same specificity
    const effective = s * 1000 + rule.priority;
    if (effective > bestScore) {
      bestScore = effective;
      best = rule;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Apply markup to a base rate
// ---------------------------------------------------------------------------

export function applyMarkup(
  baseRate: number,
  markupType: string,
  markupValue: number,
  nights: number = 1,
): number {
  switch (markupType) {
    case "PERCENTAGE":
      return baseRate * (1 + markupValue / 100);
    case "FIXED_PER_NIGHT":
      return baseRate + markupValue * nights;
    case "FIXED_PER_BOOKING":
      return baseRate + markupValue;
    default:
      return baseRate;
  }
}

// ---------------------------------------------------------------------------
// Generate full tariff data for a contract × TO
// ---------------------------------------------------------------------------

export function generateTariffRates(
  contractData: {
    contractId: string;
    contractName: string;
    contractCode: string;
    hotelName: string;
    rateBasis: string;
    seasons: { id: string; name: string; code: string }[];
    roomTypes: { roomTypeId: string; roomType: { id: string; name: string; code: string } }[];
    mealBases: { mealBasisId: string; mealBasis: { id: string; name: string; mealCode: string } }[];
    baseRates: { seasonId: string; rate: { toString(): string } }[];
    supplements: {
      supplementType: string;
      roomTypeId: string | null;
      mealBasisId: string | null;
      value: { toString(): string };
      valueType: string;
      isReduction: boolean;
    }[];
  },
  tourOperator: { name: string; code: string },
  markupRule: MarkupRuleData | null,
  currencyCode: string,
): TariffData {
  const rates: TariffRateEntry[] = [];
  const mType = markupRule?.markupType ?? "PERCENTAGE";
  const mValue = markupRule ? parseFloat(markupRule.value) : 0;

  for (const season of contractData.seasons) {
    const baseRateRecord = contractData.baseRates.find(
      (br) => br.seasonId === season.id,
    );
    const baseRate = baseRateRecord
      ? parseFloat(baseRateRecord.rate.toString())
      : 0;

    for (const rt of contractData.roomTypes) {
      // Find room type supplement
      const roomSup = contractData.supplements.find(
        (s) =>
          s.supplementType === "ROOM_TYPE" &&
          s.roomTypeId === rt.roomTypeId,
      );
      const roomSupValue = roomSup
        ? parseFloat(roomSup.value.toString()) * (roomSup.isReduction ? -1 : 1)
        : 0;

      for (const mb of contractData.mealBases) {
        // Find meal supplement
        const mealSup = contractData.supplements.find(
          (s) =>
            s.supplementType === "MEAL" &&
            s.mealBasisId === mb.mealBasisId,
        );
        const mealSupValue = mealSup
          ? parseFloat(mealSup.value.toString()) * (mealSup.isReduction ? -1 : 1)
          : 0;

        const totalBase = baseRate + roomSupValue + mealSupValue;
        const markup = applyMarkup(totalBase, mType, mValue) - totalBase;
        const sellingRate = totalBase + markup;

        rates.push({
          seasonId: season.id,
          seasonName: season.name,
          seasonCode: season.code,
          roomTypeId: rt.roomTypeId,
          roomTypeName: rt.roomType.name,
          roomTypeCode: rt.roomType.code,
          mealBasisId: mb.mealBasisId,
          mealBasisName: mb.mealBasis.name,
          mealCode: mb.mealBasis.mealCode,
          baseRate: Math.round(totalBase * 100) / 100,
          markup: Math.round(markup * 100) / 100,
          sellingRate: Math.round(sellingRate * 100) / 100,
          markupType: mType,
          markupValue: mValue,
          perNight: true,
        });
      }
    }
  }

  return {
    contractId: contractData.contractId,
    contractName: contractData.contractName,
    contractCode: contractData.contractCode,
    hotelName: contractData.hotelName,
    tourOperatorName: tourOperator.name,
    tourOperatorCode: tourOperator.code,
    markupRuleName: markupRule?.name ?? null,
    markupType: mType,
    markupValue: mValue,
    currencyCode,
    rateBasis: contractData.rateBasis,
    rates,
    generatedAt: new Date().toISOString(),
  };
}
