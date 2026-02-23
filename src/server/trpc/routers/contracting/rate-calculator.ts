import type { PrismaClient } from "@prisma/client";

import {
  rateCalculatorInputSchema,
  rateSheetInputSchema,
} from "@/lib/validations/contracting";
import {
  calculateRate,
  computeRateSheet,
} from "@/server/services/contracting/rate-calculator";
import type { RateContractData } from "@/server/services/contracting/rate-calculator";
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
            freeInSharing: override.freeInSharing,
            maxFreePerRoom: override.maxFreePerRoom,
            extraBedAllowed: override.extraBedAllowed,
          };
        }
        const hotel = hotelDefaults.find((p) => p.category === category)!;
        return {
          category: hotel.category,
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
      combinable: o.combinable,
      active: o.active,
    })),
  };
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
        viewLabel: input.viewLabel ?? null,
        nights: input.nights,
        bookingDate: input.bookingDate ?? null,
        checkInDate: input.checkInDate ?? null,
      });
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
});
