import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiError, apiSuccess } from "@/server/api-response";
import { db } from "@/server/db";

export const GET = withApiAuth(async (req: NextRequest, auth) => {
  const segments = req.nextUrl.pathname.split("/");
  const hotelId = segments[4]!;
  const contractId = segments[6]!;

  if (!auth.hotelIds.includes(hotelId)) {
    return apiError("NOT_FOUND", "Hotel not found", 404);
  }

  const contract = await db.contract.findFirst({
    where: { id: contractId, hotelId, companyId: auth.companyId, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!contract) {
    return apiError("NOT_FOUND", "Contract not found", 404);
  }

  const [allotments, stopSales] = await Promise.all([
    db.contractAllotment.findMany({
      where: { contractId },
      include: {
        roomType: { select: { id: true, name: true, code: true } },
        season: { select: { id: true, dateFrom: true, dateTo: true } },
      },
      orderBy: [{ roomTypeId: "asc" }],
    }),
    db.contractStopSale.findMany({
      where: { contractId },
      include: {
        roomType: { select: { id: true, name: true, code: true } },
      },
      orderBy: { dateFrom: "asc" },
    }),
  ]);

  return apiSuccess({
    contractId,
    allotments: allotments.map((a) => ({
      id: a.id,
      roomType: a.roomType,
      season: a.season,
      basis: a.basis,
      totalRooms: a.totalRooms,
      freeSale: a.freeSale,
    })),
    stopSales: stopSales.map((s) => ({
      id: s.id,
      roomType: s.roomType,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
      reason: s.reason,
    })),
  });
});
