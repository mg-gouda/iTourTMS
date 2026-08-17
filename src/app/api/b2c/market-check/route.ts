import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/server/db";
import { resolveMarketByCountry } from "@/server/services/b2c/market-resolver";
import { getCountryFromIP } from "@/lib/b2c/geo-ip";
import { getClientIp } from "@/lib/client-ip";
import { b2cRateLimit } from "@/server/b2c-rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await b2cRateLimit(request, "marketCheck");
    if (rateLimited) return rateLimited;
    const company = await db.company.findFirst({ select: { id: true } });
    if (!company) {
      return NextResponse.json({ hasMarket: false, country: null });
    }

    // Only x-geo-country, which proxy.ts strips from the inbound request and
    // re-derives. Reading cf-ipcountry here would reintroduce the spoof the
    // proxy exists to prevent, since nothing upstream removes it.
    let countryCode = request.headers.get("x-geo-country");

    if (!countryCode) {
      const ip = getClientIp(request);
      if (ip) {
        countryCode = await getCountryFromIP(ip);
      }
    }

    if (!countryCode || countryCode === "EG") {
      // Can't determine country, or Egypt → allow access
      return NextResponse.json({ hasMarket: true, country: countryCode });
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
