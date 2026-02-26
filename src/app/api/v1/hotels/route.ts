import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiPaginated } from "@/server/api-response";
import { db } from "@/server/db";

export const GET = withApiAuth(async (req: NextRequest, auth) => {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
  const search = url.searchParams.get("search") ?? "";

  // Only show hotels the integration has access to AND that have PUBLISHED contracts
  const publishedContracts = await db.contract.findMany({
    where: {
      companyId: auth.companyId,
      hotelId: { in: auth.hotelIds },
      status: "PUBLISHED",
    },
    select: { hotelId: true },
    distinct: ["hotelId"],
  });

  const publishedHotelIds = publishedContracts.map((c) => c.hotelId);
  if (publishedHotelIds.length === 0) {
    return apiPaginated([], 0, page, pageSize);
  }

  const where = {
    id: { in: publishedHotelIds },
    companyId: auth.companyId,
    ...(search
      ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { code: { contains: search, mode: "insensitive" as const } }] }
      : {}),
  };

  const [hotels, total] = await Promise.all([
    db.hotel.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        starRating: true,
        city: true,
        address: true,
        country: { select: { id: true, name: true, code: true } },
        destination: { select: { id: true, name: true } },
        checkInTime: true,
        checkOutTime: true,
        totalRooms: true,
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.hotel.count({ where }),
  ]);

  return apiPaginated(hotels, total, page, pageSize);
});
