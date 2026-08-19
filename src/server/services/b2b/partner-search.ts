import type { HotelResult, SearchResult } from "@/server/services/b2c/availability";
import { searchAvailability } from "@/server/services/b2c/availability";
import { db } from "@/server/db";
import { redis } from "@/server/redis";
import {
  applyPartnerMarkup,
  applyStaffMarkup,
  loadPartnerMarkupRules,
  loadStaffMarkupRules,
  pickMarkupRule,
} from "@/server/services/b2b/partner-markup";

/**
 * Search as a partner sees it: only the hotels they are allowed, priced at
 * their net rate, with their own margin shown alongside so an agent can quote
 * without doing arithmetic in their head.
 */

export { MAX_STAY_NIGHTS } from "@/lib/b2b/limits";

export const PARTNER_PAGE_SIZE = 20;

/**
 * Short enough that a booking made elsewhere in the same minute is not sold
 * twice on stale numbers, long enough to absorb an agent paging through
 * results. Invalidated outright on booking, stop-sale or allotment change.
 */
const CACHE_TTL_SECONDS = 60;

export interface PartnerRoomPricing {
  /** What the partner pays us. */
  net: number;
  /** Their own margin, per person per night × occupants × nights. */
  partnerMarkup: number;
  /** What they sell at. Never printed on our documents. */
  clientPrice: number;
  markupPppn: number;
}

export type PartnerRoomResult = HotelResult["rooms"][number] & PartnerRoomPricing;

export interface PartnerHotelResult extends Omit<HotelResult, "rooms"> {
  rooms: PartnerRoomResult[];
}

export interface PartnerSearchResult extends Omit<SearchResult, "hotels"> {
  hotels: PartnerHotelResult[];
}

export interface PartnerSearchParams {
  companyId: string;
  tourOperatorId: string;
  destinationId: string;
  hotelId?: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
  starRating?: string;
  page: number;
}

/** The hotels this partner may see. An empty allowlist means an empty search. */
export async function partnerHotelIds(tourOperatorId: string): Promise<string[]> {
  const rows = await db.hotelTourOperator.findMany({
    where: { tourOperatorId },
    select: { hotelId: true },
  });
  return rows.map((r) => r.hotelId);
}

function cacheKey(p: PartnerSearchParams, allowed: string[]): string {
  return [
    "b2b:search",
    p.tourOperatorId,
    p.destinationId,
    p.hotelId ?? "-",
    p.checkIn.toISOString().slice(0, 10),
    p.checkOut.toISOString().slice(0, 10),
    p.adults,
    p.children,
    p.infants,
    p.childAges.join("."),
    p.starRating ?? "-",
    p.page,
    // Changing the allowlist must not serve the previous one's results.
    allowed.length,
  ].join(":");
}

/** Drops every cached search for a partner — or for all of them. */
export async function invalidatePartnerSearch(tourOperatorId?: string): Promise<void> {
  try {
    await redis.connect().catch(() => {});
    const pattern = tourOperatorId ? `b2b:search:${tourOperatorId}:*` : "b2b:search:*";
    // scanStream keeps this off the main thread even with many keys.
    const stream = redis.scanStream({ match: pattern, count: 200 });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length) await redis.del(...keys);
    }
  } catch {
    // Cache is an optimisation; failing to clear it must not fail the booking.
  }
}

export async function partnerSearch(params: PartnerSearchParams): Promise<PartnerSearchResult> {
  const allowed = await partnerHotelIds(params.tourOperatorId);
  const empty: PartnerSearchResult = {
    hotels: [],
    total: 0,
    page: params.page,
    pageSize: PARTNER_PAGE_SIZE,
    totalPages: 0,
  };
  if (allowed.length === 0) return empty;
  if (params.hotelId && !allowed.includes(params.hotelId)) return empty;

  const key = cacheKey(params, allowed);
  try {
    await redis.connect().catch(() => {});
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as PartnerSearchResult;
  } catch {
    // Miss on error — the search below is the source of truth anyway.
  }

  const result = await searchAvailability({
    companyId: params.companyId,
    destinationId: params.destinationId,
    hotelId: params.hotelId,
    hotelIds: allowed,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: params.adults,
    // Infants occupy no bed, so they do not widen the room requirement; they
    // still count for the partner's per-person margin further down.
    children: params.children,
    childAges: params.childAges,
    starRating: params.starRating,
    page: params.page,
    pageSize: PARTNER_PAGE_SIZE,
    sort: "price_asc",
    skipMarkup: true,
  });

  const [rulesByHotel, staffRules] = await Promise.all([
    loadPartnerMarkupRules(params.tourOperatorId, result.hotels.map((h) => h.hotelId)),
    loadStaffMarkupRules(params.companyId, params.tourOperatorId),
  ]);
  const occupants = params.adults + params.children + params.infants;
  const stayDate = params.checkIn.toISOString().slice(0, 10);

  const hotels: PartnerHotelResult[] = result.hotels.map((hotel) => {
    const rooms: PartnerRoomResult[] = hotel.rooms.map((room) => {
      // Contract rate is our cost. The trade margin staff set for this partner
      // is what turns it into the price they actually owe us.
      const staff = applyStaffMarkup(
        staffRules,
        room.total,
        {
          contractId: hotel.contractId,
          hotelId: hotel.hotelId,
          destinationId: hotel.destinationId,
          marketId: null,
          nights: hotel.nights,
          occupants,
        },
        params.tourOperatorId,
        stayDate,
      );

      const rule = pickMarkupRule(rulesByHotel.get(hotel.hotelId), null);
      const pppn = rule?.amountPppn ?? 0;
      const { markupAmount, clientPrice } = applyPartnerMarkup(
        staff.net,
        pppn,
        occupants,
        hotel.nights,
      );

      return {
        ...room,
        // Net is what the partner owes us — the only figure on our documents.
        markupAmount: staff.markupAmount,
        displayTotal: staff.net,
        pricePerNight: Math.round((staff.net / hotel.nights) * 100) / 100,
        net: staff.net,
        partnerMarkup: markupAmount,
        clientPrice,
        markupPppn: pppn,
      };
    });

    const cheapest = rooms.length ? Math.min(...rooms.map((r) => r.net)) : 0;
    return {
      ...hotel,
      rooms,
      cheapestTotal: cheapest,
      cheapestPerNight: Math.round((cheapest / hotel.nights) * 100) / 100,
    };
  });

  const partnerResult: PartnerSearchResult = { ...result, hotels, pageSize: PARTNER_PAGE_SIZE };

  try {
    await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(partnerResult));
  } catch {
    // Cache write is best effort.
  }

  return partnerResult;
}

export interface RoomQuoteRequest {
  roomTypeId: string;
  mealBasisId: string;
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
}

export interface RoomQuote extends RoomQuoteRequest {
  net: number;
  contractId: string;
  currencyCode: string;
}

/**
 * Re-prices the rooms a partner is trying to book, from the contract.
 *
 * The booking form knows a price because search told it one, but that number
 * came back through the browser. Anything the client sends is a suggestion;
 * this is the figure we charge. Rooms are grouped by occupancy because a rate
 * depends on who is in the room, so a family and a couple need separate passes.
 */
export async function quotePartnerRooms(params: {
  companyId: string;
  tourOperatorId: string;
  hotelId: string;
  checkIn: Date;
  checkOut: Date;
  rooms: RoomQuoteRequest[];
}): Promise<RoomQuote[]> {
  const allowed = await partnerHotelIds(params.tourOperatorId);
  if (!allowed.includes(params.hotelId)) {
    throw new Error("HOTEL_NOT_ALLOWED");
  }

  const mealBases = await db.hotelMealBasis.findMany({
    where: { id: { in: [...new Set(params.rooms.map((r) => r.mealBasisId))] } },
    select: { id: true, mealCode: true },
  });
  const mealCodeById = new Map(mealBases.map((m) => [m.id, m.mealCode]));

  const groupKey = (r: RoomQuoteRequest) =>
    `${r.adults}:${r.children}:${[...r.childAges].sort().join(".")}`;

  const groups = new Map<string, RoomQuoteRequest[]>();
  for (const room of params.rooms) {
    const key = groupKey(room);
    groups.set(key, [...(groups.get(key) ?? []), room]);
  }

  const quotes: RoomQuote[] = [];
  // The same trade margin search applied. Quoting the bare contract rate here
  // would let a partner book at our cost after being shown their own price.
  const staffRules = await loadStaffMarkupRules(params.companyId, params.tourOperatorId);
  const stayDate = params.checkIn.toISOString().slice(0, 10);

  for (const [, rooms] of groups) {
    const sample = rooms[0];
    const result = await searchAvailability({
      companyId: params.companyId,
      hotelId: params.hotelId,
      hotelIds: allowed,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: sample.adults,
      children: sample.children,
      childAges: sample.childAges,
      pageSize: 1,
      skipMarkup: true,
    });

    const hotel = result.hotels[0];
    if (!hotel) throw new Error("NOT_AVAILABLE");

    for (const room of rooms) {
      const mealCode = mealCodeById.get(room.mealBasisId);
      const match = hotel.rooms.find(
        (r) => r.roomTypeId === room.roomTypeId && r.mealCode === mealCode,
      );
      if (!match || match.availability === "sold_out") throw new Error("NOT_AVAILABLE");

      const staff = applyStaffMarkup(
        staffRules,
        match.total,
        {
          contractId: hotel.contractId,
          hotelId: hotel.hotelId,
          destinationId: hotel.destinationId,
          marketId: null,
          nights: hotel.nights,
          occupants: room.adults + room.children + room.infants,
        },
        params.tourOperatorId,
        stayDate,
      );

      quotes.push({
        ...room,
        net: staff.net,
        contractId: hotel.contractId,
        currencyCode: hotel.currency,
      });
    }
  }

  return quotes;
}
