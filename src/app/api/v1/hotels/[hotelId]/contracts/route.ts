import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiError, apiPaginated } from "@/server/api-response";
import { db } from "@/server/db";

export const GET = withApiAuth(async (req: NextRequest, auth) => {
  const hotelId = req.nextUrl.pathname.split("/")[4]!;

  if (!auth.hotelIds.includes(hotelId)) {
    return apiError("NOT_FOUND", "Hotel not found", 404);
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));

  const where = {
    hotelId,
    companyId: auth.companyId,
    status: "PUBLISHED" as const,
  };

  const [contracts, total] = await Promise.all([
    db.contract.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        season: true,
        status: true,
        rateBasis: true,
        validFrom: true,
        validTo: true,
        travelFrom: true,
        travelTo: true,
        minimumStay: true,
        maximumStay: true,
        version: true,
        publishedAt: true,
        baseCurrency: { select: { id: true, code: true, name: true } },
        baseRoomType: { select: { id: true, name: true, code: true } },
        baseMealBasis: { select: { id: true, name: true, mealCode: true } },
        seasons: {
          select: { id: true, dateFrom: true, dateTo: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { validFrom: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contract.count({ where }),
  ]);

  return apiPaginated(contracts, total, page, pageSize);
});
