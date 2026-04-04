import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/server/db";
import { resolveMarketByCountry } from "@/server/services/b2c/market-resolver";
import { getCountryFromIP } from "@/lib/b2c/geo-ip";
import { b2cRateLimit } from "@/server/b2c-rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await b2cRateLimit(request, "marketCheck");
    if (rateLimited) return rateLimited;
    const company = await db.company.findFirst({ select: { id: true } });
    if (!company) {
      return NextResponse.json({ hasMarket: false, country: null });
    }

    // Resolve country code
    let countryCode =
      request.headers.get("x-geo-country") ||
      request.headers.get("cf-ipcountry") ||
      null;

    if (!countryCode) {
      const xff = request.headers.get("x-forwarded-for");
      const ip = xff ? xff.split(",")[0].trim() : null;
      if (ip) {
        countryCode = await getCountryFromIP(ip);
      }
    }

    if (!countryCode) {
      // Can't determine country → allow access (no filtering)
      return NextResponse.json({ hasMarket: true, country: null });
    }

    const market = await resolveMarketByCountry(company.id, countryCode);

    return NextResponse.json({
      hasMarket: !!market,
      country: countryCode,
      marketName: market?.name ?? null,
    });
  } catch {
    return NextResponse.json({ hasMarket: true, country: null });
  }
}
