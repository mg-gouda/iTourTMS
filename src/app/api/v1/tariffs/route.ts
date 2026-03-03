import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiPaginated } from "@/server/api-response";
import { db } from "@/server/db";

export const GET = withApiAuth(async (req: NextRequest, auth) => {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
  const hotelId = url.searchParams.get("hotelId");
  const contractId = url.searchParams.get("contractId");

  // Build where clause scoped to this tour operator + permitted hotels
  const where: Record<string, unknown> = {
    companyId: auth.companyId,
    tourOperatorId: auth.tourOperatorId,
    contract: {
      hotelId: { in: auth.hotelIds },
      status: "PUBLISHED",
    },
  };

  if (hotelId) {
    where.contract = {
      ...(where.contract as Record<string, unknown>),
      hotelId,
    };
  }

  if (contractId) {
    where.contractId = contractId;
  }

  const [tariffs, total] = await Promise.all([
    db.tariff.findMany({
      where,
      select: {
        id: true,
        name: true,
        currencyCode: true,
        generatedAt: true,
        contract: {
          select: {
            id: true,
            code: true,
            name: true,
            hotel: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.tariff.count({ where }),
  ]);

  const data = tariffs.map((t) => ({
    id: t.id,
    name: t.name,
    contractCode: t.contract.code,
    contractName: t.contract.name,
    hotelName: t.contract.hotel.name,
    hotelCode: t.contract.hotel.code,
    currencyCode: t.currencyCode,
    generatedAt: t.generatedAt,
  }));

  return apiPaginated(data, total, page, pageSize);
});
