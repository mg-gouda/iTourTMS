import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/server/db";
import { searchAvailability, type SearchResult } from "@/server/services/b2c/availability";
import { resolveMarketByCountry } from "@/server/services/b2c/market-resolver";
import { b2cRateLimit } from "@/server/b2c-rate-limit";

const VALID_SORTS = ["price_asc", "price_desc", "star_desc", "name_asc"] as const;
type SortOption = (typeof VALID_SORTS)[number];

/** Longest stay the public search will price. */
const MAX_STAY_NIGHTS = 30;

/**
 * The engine's RoomResult carries commercially sensitive internals: `total` is
 * the NET contract rate, `markupAmount` is exactly what we add on top, and
 * `remainingRooms` is live allotment. This endpoint is anonymous, so a
 * competitor could read our cost base straight out of the JSON. Project down to
 * what a shopper actually needs.
 */
function toPublicResult(result: SearchResult) {
  return {
    ...result,
    hotels: result.hotels.map((hotel) => ({
      ...hotel,
      rooms: hotel.rooms.map((room) => ({
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomTypeName,
        roomTypeCode: room.roomTypeCode,
        mealCode: room.mealCode,
        mealName: room.mealName,
        availability: room.availability,
        total: room.displayTotal,
        pricePerNight: room.pricePerNight,
        appliedOffer: room.appliedOffer
          ? {
              id: room.appliedOffer.id,
              name: room.appliedOffer.name,
              type: room.appliedOffer.type,
            }
          : null,
      })),
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await b2cRateLimit(request, "search");
    if (rateLimited) return rateLimited;
    const sp = request.nextUrl.searchParams;

    const checkInStr = sp.get("checkIn");
    const checkOutStr = sp.get("checkOut");
    const adultsStr = sp.get("adults");

    if (!checkInStr || !checkOutStr || !adultsStr) {
      return NextResponse.json(
        { error: "checkIn, checkOut, and adults are required" },
        { status: 400 },
      );
    }

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    const adults = parseInt(adultsStr, 10);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || isNaN(adults)) {
      return NextResponse.json({ error: "Invalid date or adults value" }, { status: 400 });
    }

    if (checkIn >= checkOut) {
      return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });
    }

    // The rate engine walks the stay night by night, so an unbounded range on
    // this anonymous endpoint is a one-request way to tie up the event loop.
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
    if (nights > MAX_STAY_NIGHTS) {
      return NextResponse.json(
        { error: `Stay cannot exceed ${MAX_STAY_NIGHTS} nights` },
        { status: 400 },
      );
    }

    if (adults < 1 || adults > 10) {
      return NextResponse.json({ error: "adults must be between 1 and 10" }, { status: 400 });
    }

    const childrenStr = sp.get("children") ?? "0";
    const childAgesStr = sp.get("childAges") ?? "";
    const children = parseInt(childrenStr, 10) || 0;
    const childAges = childAgesStr
      ? childAgesStr.split(",").map((a) => parseInt(a.trim(), 10)).filter((n) => !isNaN(n))
      : [];

    const company = await db.company.findFirst({ select: { id: true } });
    if (!company) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    // ── Market resolution from nationality param ──────
    const nationalityCode = sp.get("nationality") || null;

    let marketId: string | undefined;
    if (nationalityCode) {
      const market = await resolveMarketByCountry(company.id, nationalityCode);
      if (market) {
        marketId = market.id;
      }
      // If no market found for this nationality, search without market filter
      // (show all available contracts instead of blocking)
    }

    const result = await searchAvailability({
      companyId: company.id,
      destinationId: sp.get("destination") || undefined,
      hotelId: sp.get("hotelId") || undefined,
      marketId,
      checkIn,
      checkOut,
      adults,
      children,
      childAges,
      starRating: sp.get("star") || undefined,
      page: parseInt(sp.get("page") ?? "1", 10) || 1,
      pageSize: Math.min(parseInt(sp.get("pageSize") ?? "20", 10) || 20, 50),
      sort: (VALID_SORTS.includes(sp.get("sort") as SortOption) ? sp.get("sort") : "price_asc") as SortOption,
    });

    return NextResponse.json(toPublicResult(result));
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
