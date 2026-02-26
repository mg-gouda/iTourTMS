import type { NextRequest } from "next/server";

import { generateContractPdf } from "@/lib/export/contract-pdf";
import { withApiAuth } from "@/server/api-middleware";
import { apiError } from "@/server/api-response";
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
    include: {
      hotel: { select: { id: true, name: true, code: true } },
      baseCurrency: { select: { id: true, code: true, name: true } },
      baseRoomType: { select: { id: true, name: true, code: true } },
      baseMealBasis: { select: { id: true, name: true, mealCode: true } },
      parentContract: { select: { id: true, name: true, code: true, version: true } },
      createdBy: { select: { id: true, name: true } },
      postedBy: { select: { id: true, name: true } },
      publishedBy: { select: { id: true, name: true } },
      seasons: { orderBy: { sortOrder: "asc" as const } },
      roomTypes: {
        include: { roomType: { select: { id: true, name: true, code: true, maxAdults: true, maxChildren: true } } },
        orderBy: { sortOrder: "asc" as const },
      },
      mealBases: {
        include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
        orderBy: { sortOrder: "asc" as const },
      },
      baseRates: {
        include: { season: { select: { id: true, dateFrom: true, dateTo: true } } },
      },
      supplements: {
        include: {
          roomType: { select: { id: true, name: true, code: true } },
          mealBasis: { select: { id: true, name: true, mealCode: true } },
        },
        orderBy: [{ supplementType: "asc" as const }, { sortOrder: "asc" as const }],
      },
      specialOffers: {
        include: { tiers: { orderBy: { sortOrder: "asc" as const } } },
        orderBy: { sortOrder: "asc" as const },
      },
      allotments: {
        include: {
          roomType: { select: { id: true, name: true, code: true } },
          season: { select: { id: true, dateFrom: true, dateTo: true } },
        },
      },
      stopSales: {
        include: { roomType: { select: { id: true, name: true, code: true } } },
        orderBy: { dateFrom: "asc" as const },
      },
      childPolicies: { orderBy: { category: "asc" as const } },
      cancellationPolicies: { orderBy: { daysBefore: "desc" as const } },
      markets: {
        include: { market: { select: { id: true, name: true, code: true } } },
      },
      marketingContributions: {
        include: {
          market: { select: { id: true, name: true, code: true } },
          season: { select: { id: true, dateFrom: true, dateTo: true } },
        },
        orderBy: { createdAt: "asc" as const },
      },
      specialMeals: { orderBy: { dateFrom: "asc" as const } },
      seasonSpos: { orderBy: { sortOrder: "asc" as const } },
    },
  });

  if (!contract) {
    return apiError("NOT_FOUND", "Contract not found", 404);
  }

  const company = await db.company.findFirst({
    where: { id: auth.companyId },
    select: { name: true, reportsLogoUrl: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = generateContractPdf(contract as any, {
    companyName: company?.name ?? "iTourTMS",
    logoBase64: null,
  });

  return new Response(Uint8Array.from(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${contract.code}.pdf"`,
    },
  });
});
