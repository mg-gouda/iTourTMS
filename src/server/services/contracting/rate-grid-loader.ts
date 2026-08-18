import {
  computeFullRateGrid,
  type FullRateGridData,
  type RateContractData,
} from "@/server/services/contracting/rate-calculator";
import { db } from "@/server/db";

/**
 * Loading a contract and computing its full rate grid.
 *
 * Pulled out of the staff rates-PDF route because the partner portal needs the
 * same grid from the same contract. Two copies of this transform would drift,
 * and a rate sheet that disagrees with the booking engine is worse than none.
 */
export async function loadContractRateGrid(
  contractId: string,
  companyId: string,
): Promise<{
  grid: FullRateGridData;
  contract: {
    id: string;
    code: string;
    name: string;
    rateBasis: string;
    hotelName: string;
    currencyCode: string;
  };
} | null> {
  // Fetch contract with full data needed for rate calculation
  const contract = await db.contract.findFirst({
    where: { id: contractId, companyId },
    include: {
      hotel: {
        include: {
          childrenPolicies: { orderBy: { ageFrom: "asc" as const } },
        },
      },
      baseCurrency: { select: { id: true, code: true, name: true } },
      seasons: { orderBy: { sortOrder: "asc" as const } },
      roomTypes: {
        include: {
          roomType: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { sortOrder: "asc" as const },
      },
      mealBases: {
        include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
        orderBy: { sortOrder: "asc" as const },
      },
      baseRates: true,
      supplements: true,
      specialOffers: { where: { active: true }, orderBy: { sortOrder: "asc" as const } },
      childPolicies: true,
    },
  });

  if (!contract) return null;

  // Build RateContractData (same transform as tRPC fetchContractData)
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

  const rateContractData: RateContractData = {
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
    childPolicies: Array.from(allKeys).map((key) => {
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
    }),
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

  const grid = computeFullRateGrid(rateContractData);

  return {
    grid,
    contract: {
      id: contract.id,
      code: contract.code,
      name: contract.name,
      rateBasis: contract.rateBasis,
      hotelName: contract.hotel.name,
      currencyCode: contract.baseCurrency.code,
    },
  };
}
