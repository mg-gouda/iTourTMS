import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/server/db";
import { searchAvailability } from "@/server/services/b2c/availability";

export async function GET(request: NextRequest) {
  try {
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

    const result = await searchAvailability({
      companyId: company.id,
      destinationId: sp.get("destination") || undefined,
      hotelId: sp.get("hotelId") || undefined,
      checkIn,
      checkOut,
      adults,
      children,
      childAges,
      starRating: sp.get("star") || undefined,
      page: parseInt(sp.get("page") ?? "1", 10) || 1,
      pageSize: Math.min(parseInt(sp.get("pageSize") ?? "20", 10) || 20, 50),
      sort: (sp.get("sort") as any) || "price_asc",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[search] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
