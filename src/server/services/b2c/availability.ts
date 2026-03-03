import { db } from "@/server/db";
import type { MealCode, OfferType } from "@prisma/client";
import {
  mapNightsToSeasons,
  isStopSold,
  getAllotmentInfo,
  calculateBaseRate,
  calculateRoomTypeSupplement,
  calculateMealSupplement,
  calculateChildCharge,
  calculateSpecialMeals,
  applyBestOffer,
} from "./rate-calculator";

// ── Public Types ─────────────────────────────────────────

export interface SearchParams {
  companyId: string;
  destinationId?: string;
  hotelId?: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  childAges: number[];
  starRating?: string;
  page?: number;
  pageSize?: number;
  sort?: "price_asc" | "price_desc" | "star_desc" | "name_asc";
}

export interface RoomResult {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  mealCode: MealCode;
  mealName: string;
  availability: "available" | "on_request" | "limited" | "sold_out";
  remainingRooms: number;
  baseRate: number;
  roomSupplement: number;
  mealSupplement: number;
  childrenCharges: { age: number; charge: number; category: string; freeInSharing: boolean }[];
  specialMealCharge: number;
  totalBeforeOffer: number;
  total: number;
  pricePerNight: number;
  appliedOffer: { id: string; name: string; type: OfferType; saving: number } | null;
}

export interface HotelResult {
  hotelId: string;
  hotelName: string;
  hotelCode: string;
  starRating: string;
  city: string;
  destinationId: string | null;
  destinationName: string | null;
  imageUrl: string | null;
  amenities: string[];
  contractId: string;
  contractName: string;
  currency: string;
  rateBasis: string;
  nights: number;
  rooms: RoomResult[];
  cheapestTotal: number;
  cheapestPerNight: number;
}

export interface SearchResult {
  hotels: HotelResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Main Search ──────────────────────────────────────────

export async function searchAvailability(params: SearchParams): Promise<SearchResult> {
  const {
    companyId,
    destinationId,
    hotelId,
    checkIn,
    checkOut,
    adults,
    children,
    childAges,
    starRating,
    page = 1,
    pageSize = 20,
    sort = "price_asc",
  } = params;

  const nights = Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1) return { hotels: [], total: 0, page, pageSize, totalPages: 0 };

  // 1. Find PUBLISHED contracts overlapping the travel dates
  const contracts = await db.contract.findMany({
    where: {
      companyId,
      status: "PUBLISHED",
      validFrom: { lte: checkOut },
      validTo: { gte: checkIn },
      ...(hotelId ? { hotelId } : {}),
      ...(destinationId ? { hotel: { destinationId } } : {}),
      ...(starRating ? { hotel: { starRating: starRating as any } } : {}),
      hotel: {
        active: true,
        publicVisible: true,
        ...(destinationId ? { destinationId } : {}),
        ...(starRating ? { starRating: starRating as any } : {}),
      },
    },
    include: {
      hotel: {
        include: {
          destination: { select: { id: true, name: true } },
          images: { where: { isPrimary: true }, take: 1 },
          amenities: { select: { name: true }, take: 6 },
        },
      },
      baseCurrency: { select: { code: true } },
      baseRoomType: { select: { id: true } },
      baseMealBasis: { select: { id: true, mealCode: true, name: true } },
      seasons: { orderBy: { dateFrom: "asc" } },
      baseRates: true,
      roomTypes: {
        include: {
          roomType: {
            select: {
              id: true,
              name: true,
              code: true,
              maxAdults: true,
              maxChildren: true,
              maxOccupancy: true,
            },
          },
        },
      },
      mealBases: {
        include: {
          mealBasis: { select: { id: true, mealCode: true, name: true } },
        },
      },
      supplements: true,
      specialOffers: {
        where: { active: true },
        include: { tiers: true },
      },
      allotments: true,
      stopSales: true,
      childPolicies: { orderBy: { ageFrom: "asc" } },
      specialMeals: true,
    },
  });

  // 2. Process each contract → hotel results
  const hotelResults: HotelResult[] = [];

  for (const contract of contracts) {
    // Check minimum/maximum stay
    if (nights < contract.minimumStay) continue;
    if (contract.maximumStay && nights > contract.maximumStay) continue;

    // Map nights to seasons
    const seasonNights = mapNightsToSeasons(checkIn, checkOut, contract.seasons);
    if (seasonNights.length !== nights) continue; // Not all nights covered by seasons

    const rooms: RoomResult[] = [];

    // 3. For each room type in the contract
    for (const crt of contract.roomTypes) {
      const rt = crt.roomType;

      // Check occupancy fits
      if (adults > rt.maxAdults) continue;
      if (children > rt.maxChildren) continue;
      if (adults + children > rt.maxOccupancy) continue;

      // Check stop sales
      if (isStopSold(checkIn, checkOut, rt.id, contract.stopSales)) continue;

      // Check allotment
      const allotInfo = getAllotmentInfo(rt.id, seasonNights, contract.allotments);
      if (!allotInfo.available) continue;

      // Calculate base rate
      const baseRate = calculateBaseRate(
        seasonNights,
        contract.baseRates,
        contract.rateBasis,
        adults,
      );

      // Room type supplement
      const roomSup = calculateRoomTypeSupplement(
        seasonNights,
        contract.supplements,
        rt.id,
        contract.baseRoomType.id,
        adults,
      );

      // For each meal plan in the contract
      for (const cmb of contract.mealBases) {
        const mb = cmb.mealBasis;

        // Meal supplement
        const mealSup = calculateMealSupplement(
          seasonNights,
          contract.supplements,
          mb.id,
          contract.baseMealBasis.id,
          adults,
        );

        // Child charges
        const adultRatePerNight = (baseRate + roomSup) / nights / adults;
        const childCharges = childAges.map((age) =>
          calculateChildCharge(age, contract.childPolicies, adultRatePerNight, nights),
        );
        const totalChildCharges = childCharges.reduce((sum, c) => sum + c.charge, 0);

        // Special meals
        const specialMealCharge = calculateSpecialMeals(
          checkIn,
          checkOut,
          contract.specialMeals,
          mb.mealCode,
          adults,
          childAges,
        );

        const totalBeforeOffer = baseRate + roomSup + mealSup + totalChildCharges + specialMealCharge;

        // Apply best offer
        const { discountedTotal, appliedOffer } = applyBestOffer(
          totalBeforeOffer,
          contract.specialOffers,
          checkIn,
          nights,
        );

        const total = Math.round(discountedTotal * 100) / 100;

        rooms.push({
          roomTypeId: rt.id,
          roomTypeName: rt.name,
          roomTypeCode: rt.code,
          mealCode: mb.mealCode,
          mealName: mb.name,
          availability: allotInfo.status,
          remainingRooms: allotInfo.remaining,
          baseRate: Math.round(baseRate * 100) / 100,
          roomSupplement: Math.round(roomSup * 100) / 100,
          mealSupplement: Math.round(mealSup * 100) / 100,
          childrenCharges: childCharges.map((c, i) => ({
            age: childAges[i],
            charge: Math.round(c.charge * 100) / 100,
            category: c.category,
            freeInSharing: c.freeInSharing,
          })),
          specialMealCharge: Math.round(specialMealCharge * 100) / 100,
          totalBeforeOffer: Math.round(totalBeforeOffer * 100) / 100,
          total,
          pricePerNight: Math.round((total / nights) * 100) / 100,
          appliedOffer,
        });
      }
    }

    if (rooms.length === 0) continue;

    // Sort rooms by total price
    rooms.sort((a, b) => a.total - b.total);

    hotelResults.push({
      hotelId: contract.hotel.id,
      hotelName: contract.hotel.name,
      hotelCode: contract.hotel.code,
      starRating: contract.hotel.starRating,
      city: contract.hotel.city,
      destinationId: contract.hotel.destination?.id ?? null,
      destinationName: contract.hotel.destination?.name ?? null,
      imageUrl: contract.hotel.images[0]?.url ?? null,
      amenities: contract.hotel.amenities.map((a) => a.name),
      contractId: contract.id,
      contractName: contract.name,
      currency: contract.baseCurrency.code,
      rateBasis: contract.rateBasis,
      nights,
      rooms,
      cheapestTotal: rooms[0].total,
      cheapestPerNight: rooms[0].pricePerNight,
    });
  }

  // 4. Deduplicate: keep best contract per hotel
  const hotelMap = new Map<string, HotelResult>();
  for (const hr of hotelResults) {
    const existing = hotelMap.get(hr.hotelId);
    if (!existing || hr.cheapestTotal < existing.cheapestTotal) {
      hotelMap.set(hr.hotelId, hr);
    }
  }

  let results = [...hotelMap.values()];

  // 5. Sort
  switch (sort) {
    case "price_desc":
      results.sort((a, b) => b.cheapestTotal - a.cheapestTotal);
      break;
    case "star_desc":
      results.sort((a, b) => starOrder(b.starRating) - starOrder(a.starRating));
      break;
    case "name_asc":
      results.sort((a, b) => a.hotelName.localeCompare(b.hotelName));
      break;
    case "price_asc":
    default:
      results.sort((a, b) => a.cheapestTotal - b.cheapestTotal);
      break;
  }

  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const paginated = results.slice((page - 1) * pageSize, page * pageSize);

  return { hotels: paginated, total, page, pageSize, totalPages };
}

function starOrder(sr: string): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
    FIVE_DELUXE: 6,
  };
  return map[sr] ?? 0;
}
