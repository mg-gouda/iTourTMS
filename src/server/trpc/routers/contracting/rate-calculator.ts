import type { PrismaClient } from "@prisma/client";

import {
  rateCalculatorInputSchema,
  multiRoomRateCalculatorInputSchema,
  rateSheetInputSchema,
} from "@/lib/validations/contracting";
import {
  calculateRate,
  calculateMultiRoomRate,
  computeRateSheet,
  computeFullRateGrid,
} from "@/server/services/contracting/rate-calculator";
import type { RateContractData, OccupancyRow } from "@/server/services/contracting/rate-calculator";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

async function fetchContractData(
  db: PrismaClient,
  contractId: string,
  companyId: string,
): Promise<RateContractData> {
  const contract = await db.contract.findFirstOrThrow({
    where: { id: contractId, companyId },
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
      childPolicies: true,
      hotel: {
        include: {
          childrenPolicies: { orderBy: { ageFrom: "asc" } },
        },
      },
    },
  });

  return {
    rateBasis: contract.rateBasis as "PER_PERSON" | "PER_ROOM",
    baseRoomTypeId: contract.baseRoomTypeId,
    baseMealBasisId: contract.baseMealBasisId,
    seasons: contract.seasons.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
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
    childPolicies: (() => {
      // Contract-level overrides take precedence over hotel defaults
      const contractOverrides = new Map(
        contract.childPolicies.map((cp) => [cp.category, cp]),
      );
      const hotelDefaults = contract.hotel.childrenPolicies;
      const categories = new Set([
        ...hotelDefaults.map((p) => p.category),
        ...contract.childPolicies.map((p) => p.category),
      ]);
      return Array.from(categories).map((category) => {
        const override = contractOverrides.get(category);
        if (override) {
          return {
            category: override.category,
            ageFrom: override.ageFrom,
            ageTo: override.ageTo,
            freeInSharing: override.freeInSharing,
            maxFreePerRoom: override.maxFreePerRoom,
            extraBedAllowed: override.extraBedAllowed,
          };
        }
        const hotel = hotelDefaults.find((p) => p.category === category)!;
        return {
          category: hotel.category,
          ageFrom: hotel.ageFrom,
          ageTo: hotel.ageTo,
          freeInSharing: hotel.freeInSharing,
          maxFreePerRoom: hotel.maxFreePerRoom,
          extraBedAllowed: hotel.extraBedAllowed,
        };
      });
    })(),
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
  };
}

async function fetchOccupancyTables(
  db: PrismaClient,
  roomTypeIds: string[],
): Promise<OccupancyRow[]> {
  const rows = await db.roomTypeOccupancy.findMany({
    where: { roomTypeId: { in: roomTypeIds } },
  });
  return rows.map((r) => ({
    id: r.id,
    roomTypeId: r.roomTypeId,
    adults: r.adults,
    children: r.children,
    infants: r.infants,
    extraBeds: r.extraBeds,
    isDefault: r.isDefault,
    description: r.description,
  }));
}

export const rateCalculatorRouter = createTRPCRouter({
  calculate: proc
    .input(rateCalculatorInputSchema)
    .query(async ({ ctx, input }) => {
      const contractData = await fetchContractData(
        ctx.db,
        input.contractId,
        ctx.companyId,
      );
      return calculateRate(contractData, {
        seasonId: input.seasonId,
        roomTypeId: input.roomTypeId,
        mealBasisId: input.mealBasisId,
        adults: input.adults,
        children: input.children,
        extraBed: input.extraBed,
        nights: input.nights,
        bookingDate: input.bookingDate ?? null,
        checkInDate: input.checkInDate ?? null,
      });
    }),

  calculateMultiRoom: proc
    .input(multiRoomRateCalculatorInputSchema)
    .query(async ({ ctx, input }) => {
      const contractData = await fetchContractData(ctx.db, input.contractId, ctx.companyId);
      const roomTypeIds = contractData.roomTypes.map((rt) => rt.roomTypeId);
      const occupancyTables = await fetchOccupancyTables(ctx.db, roomTypeIds);
      return calculateMultiRoomRate(contractData, occupancyTables, input);
    }),

  getRateSheet: proc
    .input(rateSheetInputSchema)
    .query(async ({ ctx, input }) => {
      const contractData = await fetchContractData(
        ctx.db,
        input.contractId,
        ctx.companyId,
      );
      return computeRateSheet(contractData);
    }),

  getFullRateGrid: proc
    .input(rateSheetInputSchema)
    .query(async ({ ctx, input }) => {
      const contractData = await fetchContractData(
        ctx.db,
        input.contractId,
        ctx.companyId,
      );
      return computeFullRateGrid(contractData);
    }),
});
