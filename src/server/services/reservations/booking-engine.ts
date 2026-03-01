import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";

import {
  calculateRate,
  detectSeason,
  type RateBreakdown,
  type RateContractData,
  type BookingScenario,
} from "@/server/services/contracting/rate-calculator";
import {
  resolveMarkupRule,
  applyMarkup,
  type MarkupRuleData,
  type ResolveContext,
} from "@/server/services/contracting/markup-calculator";
import { checkStopSales } from "@/server/services/contracting/stop-sale-checker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoomInput {
  roomTypeId: string;
  mealBasisId: string;
  adults: number;
  children: { category: string }[];
  extraBed: boolean;
}

export interface RoomRateResult {
  roomIndex: number;
  roomTypeId: string;
  mealBasisId: string;
  adults: number;
  children: { category: string }[];
  extraBed: boolean;
  buyingRatePerNight: number;
  buyingTotal: number;
  sellingRatePerNight: number;
  sellingTotal: number;
  breakdown: RateBreakdown;
}

export interface BookingRateResult {
  seasonId: string | null;
  nights: number;
  rooms: RoomRateResult[];
  buyingTotal: number;
  sellingTotal: number;
  markupRuleId: string | null;
  markupRuleName: string | null;
  markupType: string;
  markupValue: number;
  markupAmount: number;
  currencyId: string;
  warnings: string[];
}

export interface AvailabilityResult {
  available: boolean;
  warnings: string[];
  details: {
    roomTypeId: string;
    totalRooms: number;
    soldRooms: number;
    remaining: number;
    basis: string;
    ok: boolean;
  }[];
}

// ---------------------------------------------------------------------------
// Fetch contract data for rate calculation (reuse pattern from API calculate)
// ---------------------------------------------------------------------------

export async function fetchContractForRates(
  db: PrismaClient,
  contractId: string,
  companyId: string,
): Promise<{ contractData: RateContractData; currencyId: string } | null> {
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
  const allKeys = new Set([
    ...contract.hotel.childrenPolicies.map(ageKey),
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
    const hotel = contract.hotel.childrenPolicies.find((p) => ageKey(p) === key)!;
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

  const contractData: RateContractData = {
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

  return { contractData, currencyId: contract.baseCurrencyId };
}

// ---------------------------------------------------------------------------
// Compute nights between two ISO date strings
// ---------------------------------------------------------------------------

export function computeNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86_400_000));
}

// ---------------------------------------------------------------------------
// Calculate rates for a full booking (all rooms)
// ---------------------------------------------------------------------------

export async function calculateBookingRates(
  db: PrismaClient,
  companyId: string,
  input: {
    contractId: string;
    hotelId: string;
    tourOperatorId?: string | null;
    checkIn: string;
    checkOut: string;
    rooms: RoomInput[];
    bookingDate?: string | null;
  },
): Promise<BookingRateResult> {
  const nights = computeNights(input.checkIn, input.checkOut);
  const warnings: string[] = [];

  // Fetch contract data
  const result = await fetchContractForRates(db, input.contractId, companyId);
  if (!result) throw new Error("Contract not found or not published");
  const { contractData, currencyId } = result;

  // Detect season
  const season = detectSeason(input.checkIn, contractData.seasons);
  if (!season) {
    warnings.push("No season covers the check-in date");
  }

  // Resolve markup rule
  const markupRules = await db.markupRule.findMany({
    where: { companyId, active: true },
  });
  const resolveCtx: ResolveContext = {
    contractId: input.contractId,
    hotelId: input.hotelId,
    destinationId: null,
    marketId: null,
    tourOperatorId: input.tourOperatorId || null,
    date: input.checkIn,
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

  // Calculate per-room rates
  const roomResults: RoomRateResult[] = [];
  let totalBuying = new Decimal(0);
  let totalSelling = new Decimal(0);

  for (let i = 0; i < input.rooms.length; i++) {
    const room = input.rooms[i]!;
    const scenario: BookingScenario = {
      seasonId: season?.id ?? "",
      roomTypeId: room.roomTypeId,
      mealBasisId: room.mealBasisId,
      adults: room.adults,
      children: room.children,
      extraBed: room.extraBed,
      nights,
      bookingDate: input.bookingDate ?? null,
      checkInDate: input.checkIn,
    };

    const breakdown = calculateRate(contractData, scenario);
    const buyingTotal = breakdown.totalStayAfterOffers;
    const sellingTotal = applyMarkup(buyingTotal, mType, mValue, nights);
    const buyingPerNight = new Decimal(buyingTotal).div(nights).toDecimalPlaces(4).toNumber();
    const sellingPerNight = new Decimal(sellingTotal).div(nights).toDecimalPlaces(4).toNumber();

    totalBuying = totalBuying.plus(buyingTotal);
    totalSelling = totalSelling.plus(sellingTotal);

    roomResults.push({
      roomIndex: i + 1,
      roomTypeId: room.roomTypeId,
      mealBasisId: room.mealBasisId,
      adults: room.adults,
      children: room.children,
      extraBed: room.extraBed,
      buyingRatePerNight: buyingPerNight,
      buyingTotal: Math.round(buyingTotal * 100) / 100,
      sellingRatePerNight: sellingPerNight,
      sellingTotal: Math.round(sellingTotal * 100) / 100,
      breakdown,
    });
  }

  const buyTotalNum = totalBuying.toDecimalPlaces(4).toNumber();
  const sellTotalNum = totalSelling.toDecimalPlaces(4).toNumber();

  return {
    seasonId: season?.id ?? null,
    nights,
    rooms: roomResults,
    buyingTotal: buyTotalNum,
    sellingTotal: sellTotalNum,
    markupRuleId: markupRule?.id ?? null,
    markupRuleName: markupRule?.name ?? null,
    markupType: mType,
    markupValue: mValue,
    markupAmount: Math.round((sellTotalNum - buyTotalNum) * 100) / 100,
    currencyId,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Check availability (allotments + stop sales)
// ---------------------------------------------------------------------------

export async function checkAvailability(
  db: PrismaClient,
  contractId: string,
  checkIn: string,
  checkOut: string,
  roomTypeIds: string[],
): Promise<AvailabilityResult> {
  const warnings: string[] = [];

  // Check stop sales
  const stopSales = await db.contractStopSale.findMany({
    where: { contractId },
  });
  const ssWarnings = checkStopSales(stopSales, checkIn, checkOut);
  warnings.push(...ssWarnings);

  // Check allotments per room type
  const uniqueRoomTypes = [...new Set(roomTypeIds)];
  const roomCounts = new Map<string, number>();
  for (const rt of roomTypeIds) {
    roomCounts.set(rt, (roomCounts.get(rt) ?? 0) + 1);
  }

  const allotments = await db.contractAllotment.findMany({
    where: { contractId, roomTypeId: { in: uniqueRoomTypes } },
  });

  const details: AvailabilityResult["details"] = [];
  let allAvailable = true;

  for (const rtId of uniqueRoomTypes) {
    const allotment = allotments.find((a) => a.roomTypeId === rtId);
    const needed = roomCounts.get(rtId) ?? 1;

    if (!allotment) {
      // No allotment record — treat as freesale
      details.push({
        roomTypeId: rtId,
        totalRooms: 0,
        soldRooms: 0,
        remaining: 999,
        basis: "FREESALE",
        ok: true,
      });
      continue;
    }

    if (allotment.basis === "FREESALE") {
      details.push({
        roomTypeId: rtId,
        totalRooms: allotment.totalRooms,
        soldRooms: allotment.soldRooms,
        remaining: 999,
        basis: "FREESALE",
        ok: true,
      });
      continue;
    }

    if (allotment.basis === "ON_REQUEST") {
      warnings.push(`Room type requires on-request approval`);
      details.push({
        roomTypeId: rtId,
        totalRooms: allotment.totalRooms,
        soldRooms: allotment.soldRooms,
        remaining: allotment.totalRooms - allotment.soldRooms,
        basis: "ON_REQUEST",
        ok: true,
      });
      continue;
    }

    // COMMITMENT or ALLOCATION — hard check
    const remaining = allotment.totalRooms - allotment.soldRooms;
    const ok = remaining >= needed;
    if (!ok) {
      allAvailable = false;
      warnings.push(
        `Insufficient allotment: ${remaining} rooms available, ${needed} needed`,
      );
    }

    details.push({
      roomTypeId: rtId,
      totalRooms: allotment.totalRooms,
      soldRooms: allotment.soldRooms,
      remaining,
      basis: allotment.basis,
      ok,
    });
  }

  return {
    available: allAvailable && ssWarnings.length === 0,
    warnings,
    details,
  };
}

// ---------------------------------------------------------------------------
// Allotment management (transactional)
// ---------------------------------------------------------------------------

export async function deductAllotment(
  db: PrismaClient,
  contractId: string,
  roomTypeIds: string[],
): Promise<void> {
  const counts = new Map<string, number>();
  for (const rt of roomTypeIds) {
    counts.set(rt, (counts.get(rt) ?? 0) + 1);
  }

  for (const [roomTypeId, count] of counts.entries()) {
    await db.contractAllotment.updateMany({
      where: {
        contractId,
        roomTypeId,
        basis: { in: ["COMMITMENT", "ALLOCATION"] },
      },
      data: { soldRooms: { increment: count } },
    });
  }
}

export async function restoreAllotment(
  db: PrismaClient,
  contractId: string,
  roomTypeIds: string[],
): Promise<void> {
  const counts = new Map<string, number>();
  for (const rt of roomTypeIds) {
    counts.set(rt, (counts.get(rt) ?? 0) + 1);
  }

  for (const [roomTypeId, count] of counts.entries()) {
    await db.contractAllotment.updateMany({
      where: {
        contractId,
        roomTypeId,
        basis: { in: ["COMMITMENT", "ALLOCATION"] },
      },
      data: { soldRooms: { decrement: count } },
    });
  }
}
