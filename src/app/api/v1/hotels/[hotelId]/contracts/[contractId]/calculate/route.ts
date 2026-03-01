import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiError, apiSuccess } from "@/server/api-response";
import { db } from "@/server/db";
import {
  calculateRate,
  type RateContractData,
} from "@/server/services/contracting/rate-calculator";
import {
  resolveMarkupRule,
  applyMarkup,
  type MarkupRuleData,
  type ResolveContext,
} from "@/server/services/contracting/markup-calculator";

async function fetchContractData(
  contractId: string,
  companyId: string,
): Promise<RateContractData | null> {
  const contract = await db.contract.findFirst({
    where: { id: contractId, companyId, status: "PUBLISHED" },
    include: {
      seasons: { orderBy: { sortOrder: "asc" } },
      roomTypes: {
        include: { roomType: { select: { id: true, name: true, code: true } } },
        orderBy: { sortOrder: "asc" },
      },
      mealBases: {
        include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
        orderBy: { sortOrder: "asc" },
      },
      baseRates: true,
      supplements: true,
      specialOffers: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      seasonSpos: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      childPolicies: true,
      hotel: {
        include: { childrenPolicies: { orderBy: { ageFrom: "asc" } } },
      },
    },
  });

  if (!contract) return null;

  // Merge child policies (contract overrides hotel defaults)
  // Key by age range to support multiple policies per category
  const ageKey = (p: { ageFrom: number; ageTo: number }) => `${p.ageFrom}-${p.ageTo}`;
  const contractOverrides = new Map(
    contract.childPolicies.map((cp) => [ageKey(cp), cp]),
  );
  const hotelDefaults = contract.hotel.childrenPolicies;
  const allKeys = new Set([
    ...hotelDefaults.map(ageKey),
    ...contract.childPolicies.map(ageKey),
  ]);
  const childPolicies = Array.from(allKeys).map((key) => {
    const override = contractOverrides.get(key);
    if (override) {
      return {
        category: override.category,
        ageFrom: override.ageFrom,
        ageTo: override.ageTo,
        freeInSharing: override.freeInSharing,
        maxFreePerRoom: override.maxFreePerRoom,
        extraBedAllowed: override.extraBedAllowed,
        chargePercentage: override.chargePercentage,
      };
    }
    const hotel = hotelDefaults.find((p) => ageKey(p) === key)!;
    return {
      category: hotel.category,
      ageFrom: hotel.ageFrom,
      ageTo: hotel.ageTo,
      freeInSharing: hotel.freeInSharing,
      maxFreePerRoom: hotel.maxFreePerRoom,
      extraBedAllowed: hotel.extraBedAllowed,
      chargePercentage: hotel.chargePercentage,
    };
  });

  return {
    rateBasis: contract.rateBasis as "PER_PERSON" | "PER_ROOM",
    baseRoomTypeId: contract.baseRoomTypeId,
    baseMealBasisId: contract.baseMealBasisId,
    seasons: contract.seasons.map((s) => ({
      id: s.id,
      dateFrom: s.dateFrom.toISOString().slice(0, 10),
      dateTo: s.dateTo.toISOString().slice(0, 10),
    })),
    roomTypes: contract.roomTypes.map((rt) => ({
      roomTypeId: rt.roomTypeId,
      isBase: rt.isBase,
      roomType: rt.roomType,
    })),
    mealBases: contract.mealBases.map((mb) => ({
      mealBasisId: mb.mealBasisId,
      isBase: mb.isBase,
      mealBasis: mb.mealBasis,
    })),
    baseRates: contract.baseRates.map((br) => ({
      seasonId: br.seasonId,
      rate: br.rate.toString(),
      singleRate: br.singleRate?.toString() ?? null,
      doubleRate: br.doubleRate?.toString() ?? null,
      tripleRate: br.tripleRate?.toString() ?? null,
    })),
    supplements: contract.supplements.map((s) => ({
      seasonId: s.seasonId,
      supplementType: s.supplementType,
      roomTypeId: s.roomTypeId,
      mealBasisId: s.mealBasisId,
      forAdults: s.forAdults,
      forChildCategory: s.forChildCategory,
      forChildBedding: s.forChildBedding,
      childPosition: s.childPosition,
      valueType: s.valueType,
      value: s.value.toString(),
      isReduction: s.isReduction,
      perPerson: s.perPerson,
      perNight: s.perNight,
      label: s.label,
    })),
    childPolicies,
    specialOffers: contract.specialOffers.map((o) => ({
      id: o.id,
      name: o.name,
      offerType: o.offerType,
      validFrom: o.validFrom?.toISOString().slice(0, 10) ?? null,
      validTo: o.validTo?.toISOString().slice(0, 10) ?? null,
      bookByDate: o.bookByDate?.toISOString().slice(0, 10) ?? null,
      minimumNights: o.minimumNights,
      minimumRooms: o.minimumRooms,
      advanceBookDays: o.advanceBookDays,
      discountType: o.discountType,
      discountValue: o.discountValue.toString(),
      stayNights: o.stayNights,
      payNights: o.payNights,
      bookFromDate: o.bookFromDate?.toISOString().slice(0, 10) ?? null,
      stayDateType: o.stayDateType,
      paymentPct: o.paymentPct,
      paymentDeadline: o.paymentDeadline?.toISOString().slice(0, 10) ?? null,
      roomingListBy: o.roomingListBy?.toISOString().slice(0, 10) ?? null,
      combinable: o.combinable,
      active: o.active,
    })),
    seasonSpos: contract.seasonSpos.map((spo) => ({
      spoType: spo.spoType,
      dateFrom: spo.dateFrom.toISOString().slice(0, 10),
      dateTo: spo.dateTo.toISOString().slice(0, 10),
      basePp: spo.basePp?.toString() ?? null,
      sglSup: spo.sglSup?.toString() ?? null,
      thirdAdultRed: spo.thirdAdultRed?.toString() ?? null,
      firstChildPct: spo.firstChildPct?.toString() ?? null,
      secondChildPct: spo.secondChildPct?.toString() ?? null,
      bookFrom: spo.bookFrom?.toISOString().slice(0, 10) ?? null,
      bookTo: spo.bookTo?.toISOString().slice(0, 10) ?? null,
      value: spo.value?.toString() ?? null,
      valueType: spo.valueType,
      active: spo.active,
    })),
  };
}

export const POST = withApiAuth(async (req: NextRequest, auth) => {
  const segments = req.nextUrl.pathname.split("/");
  const hotelId = segments[4]!;
  const contractId = segments[6]!;

  if (!auth.hotelIds.includes(hotelId)) {
    return apiError("NOT_FOUND", "Hotel not found", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const {
    seasonId,
    roomTypeId,
    mealBasisId,
    adults = 2,
    children = [],
    extraBed = false,
    nights = 1,
    bookingDate = null,
    checkInDate = null,
  } = body as {
    seasonId?: string;
    roomTypeId?: string;
    mealBasisId?: string;
    adults?: number;
    children?: { category: string }[];
    extraBed?: boolean;
    nights?: number;
    bookingDate?: string | null;
    checkInDate?: string | null;
  };

  if (!seasonId || !roomTypeId || !mealBasisId) {
    return apiError("BAD_REQUEST", "seasonId, roomTypeId, and mealBasisId are required", 400);
  }

  const contractData = await fetchContractData(contractId, auth.companyId);
  if (!contractData) {
    return apiError("NOT_FOUND", "Contract not found", 404);
  }

  // Calculate buying rate
  const breakdown = calculateRate(contractData, {
    seasonId,
    roomTypeId,
    mealBasisId,
    adults: adults as number,
    children: children as { category: string }[],
    extraBed: extraBed as boolean,
    nights: nights as number,
    bookingDate: bookingDate as string | null,
    checkInDate: checkInDate as string | null,
  });

  // Resolve and apply markup to get selling rate
  const markupRules = await db.markupRule.findMany({
    where: { companyId: auth.companyId, active: true },
  });

  const contract = await db.contract.findFirst({
    where: { id: contractId },
    select: { hotelId: true },
  });

  const resolveCtx: ResolveContext = {
    contractId,
    hotelId: contract?.hotelId ?? hotelId,
    destinationId: null,
    marketId: null,
    tourOperatorId: auth.tourOperatorId,
  };

  const rules: MarkupRuleData[] = markupRules.map((r) => ({
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
    validFrom: r.validFrom?.toISOString().slice(0, 10) ?? null,
    validTo: r.validTo?.toISOString().slice(0, 10) ?? null,
  }));

  const markupRule = resolveMarkupRule(rules, resolveCtx);
  const mType = markupRule?.markupType ?? "PERCENTAGE";
  const mValue = markupRule ? parseFloat(markupRule.value) : 0;

  const buyingTotal = breakdown.totalStayAfterOffers;
  const sellingTotal = applyMarkup(buyingTotal, mType, mValue, nights as number);
  const markupAmount = Math.round((sellingTotal - buyingTotal) * 100) / 100;

  return apiSuccess({
    ...breakdown,
    sellingRate: {
      total: Math.round(sellingTotal * 100) / 100,
      markup: markupAmount,
      markupType: mType,
      markupValue: mValue,
      markupRuleName: markupRule?.name ?? null,
    },
  });
});
