import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiError, apiSuccess } from "@/server/api-response";
import { db } from "@/server/db";
import type { TariffRateEntry } from "@/server/services/contracting/markup-calculator";

export const GET = withApiAuth(async (req: NextRequest, auth) => {
  const tariffId = req.nextUrl.pathname.split("/").pop()!;

  // Fetch tariff scoped to this tour operator
  const tariff = await db.tariff.findFirst({
    where: {
      id: tariffId,
      companyId: auth.companyId,
      tourOperatorId: auth.tourOperatorId,
    },
    include: {
      contract: {
        include: {
          hotel: {
            select: {
              name: true,
              code: true,
              starRating: true,
            },
          },
          seasons: {
            select: {
              dateFrom: true,
              dateTo: true,
              releaseDays: true,
            },
            orderBy: { sortOrder: "asc" as const },
          },
          roomTypes: {
            include: {
              roomType: {
                select: {
                  name: true,
                  code: true,
                  maxAdults: true,
                },
              },
            },
            orderBy: { sortOrder: "asc" as const },
          },
          mealBases: {
            include: {
              mealBasis: {
                select: { name: true, mealCode: true },
              },
            },
            orderBy: { sortOrder: "asc" as const },
          },
          allotments: {
            include: {
              roomType: { select: { name: true, code: true } },
              season: { select: { dateFrom: true, dateTo: true } },
            },
            orderBy: { roomTypeId: "asc" as const },
          },
          cancellationPolicies: {
            orderBy: { daysBefore: "desc" as const },
          },
          childPolicies: {
            orderBy: { category: "asc" as const },
          },
          specialOffers: {
            orderBy: { sortOrder: "asc" as const },
          },
          stopSales: {
            include: {
              roomType: { select: { name: true } },
            },
            orderBy: { dateFrom: "asc" as const },
          },
        },
      },
    },
  });

  if (!tariff) {
    return apiError("NOT_FOUND", "Tariff not found", 404);
  }

  // Verify hotel access
  if (!auth.hotelIds.includes(tariff.contract.hotelId)) {
    return apiError("NOT_FOUND", "Tariff not found", 404);
  }

  const c = tariff.contract;

  // Extract selling rates, stripping cost data
  const tariffData = tariff.data as Record<string, unknown>;
  const storedRates = (tariffData?.rates as TariffRateEntry[]) ?? [];
  const sellingRates = storedRates.map((r) => ({
    seasonLabel: r.seasonLabel,
    roomTypeName: r.roomTypeName,
    roomTypeCode: r.roomTypeCode,
    mealBasisName: r.mealBasisName,
    mealCode: r.mealCode,
    sellingRate: r.sellingRate,
    perNight: r.perNight,
  }));

  return apiSuccess({
    id: tariff.id,
    name: tariff.name,
    currencyCode: tariff.currencyCode,
    generatedAt: tariff.generatedAt,
    contract: {
      id: c.id,
      name: c.name,
      code: c.code,
      validFrom: c.validFrom,
      validTo: c.validTo,
      rateBasis: c.rateBasis,
      hotel: {
        name: c.hotel.name,
        code: c.hotel.code,
        starRating: c.hotel.starRating,
      },
      seasons: c.seasons.map((s) => ({
        dateFrom: s.dateFrom,
        dateTo: s.dateTo,
        releaseDays: s.releaseDays,
      })),
      roomTypes: c.roomTypes.map((rt) => ({
        name: rt.roomType.name,
        code: rt.roomType.code,
        maxAdults: rt.roomType.maxAdults,
      })),
      mealBases: c.mealBases.map((mb) => ({
        name: mb.mealBasis.name,
        mealCode: mb.mealBasis.mealCode,
      })),
      allotments: c.allotments.map((a) => ({
        roomTypeName: a.roomType.name,
        roomTypeCode: a.roomType.code,
        totalRooms: a.totalRooms,
        freeSale: a.freeSale,
        basis: a.basis,
        season: a.season
          ? { dateFrom: a.season.dateFrom, dateTo: a.season.dateTo }
          : null,
      })),
      cancellationPolicies: c.cancellationPolicies.map((cp) => ({
        daysBefore: cp.daysBefore,
        chargeType: cp.chargeType,
        chargeValue: cp.chargeValue,
        description: cp.description,
      })),
      childPolicies: c.childPolicies.map((cp) => ({
        category: cp.category,
        ageFrom: cp.ageFrom,
        ageTo: cp.ageTo,
        freeInSharing: cp.freeInSharing,
        maxFreePerRoom: cp.maxFreePerRoom,
        extraBedAllowed: cp.extraBedAllowed,
        mealsIncluded: cp.mealsIncluded,
      })),
      specialOffers: c.specialOffers.map((so) => ({
        name: so.name,
        offerType: so.offerType,
        discountType: so.discountType,
        discountValue: so.discountValue,
        validFrom: so.validFrom,
        validTo: so.validTo,
        bookByDate: so.bookByDate,
        minimumNights: so.minimumNights,
        stayNights: so.stayNights,
        payNights: so.payNights,
        combinable: so.combinable,
        active: so.active,
      })),
      stopSales: c.stopSales.map((ss) => ({
        roomTypeName: ss.roomType?.name ?? null,
        dateFrom: ss.dateFrom,
        dateTo: ss.dateTo,
        reason: ss.reason,
      })),
    },
    sellingRates,
  });
});
