import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiError, apiSuccess } from "@/server/api-response";
import { db } from "@/server/db";
import {
  resolveMarkupRule,
  generateTariffRates,
  type MarkupRuleData,
  type ResolveContext,
} from "@/server/services/contracting/markup-calculator";

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
      hotel: { select: { id: true, name: true } },
      baseCurrency: { select: { code: true } },
      seasons: { orderBy: { sortOrder: "asc" } },
      roomTypes: {
        include: { roomType: { select: { id: true, name: true, code: true } } },
        orderBy: { sortOrder: "asc" },
      },
      mealBases: {
        include: { mealBasis: { select: { id: true, name: true, mealCode: true } } },
        orderBy: { sortOrder: "asc" },
      },
      baseRates: true,
      supplements: true,
    },
  });

  if (!contract) {
    return apiError("NOT_FOUND", "Contract not found", 404);
  }

  // Resolve markup
  const markupRules = await db.markupRule.findMany({
    where: { companyId: auth.companyId, active: true },
  });

  const resolveCtx: ResolveContext = {
    contractId: contract.id,
    hotelId: contract.hotelId,
    destinationId: null,
    marketId: null,
    tourOperatorId: auth.tourOperatorId,
  };

  const rules: MarkupRuleData[] = markupRules.map((r) => ({
    id: r.id,
    name: r.name,
    markupType: r.markupType,
    value: r.value.toString(),
    contractId: r.contractId,
    hotelId: r.hotelId,
    destinationId: r.destinationId,
    marketId: r.marketId,
    tourOperatorId: r.tourOperatorId,
    priority: r.priority,
    active: r.active,
    validFrom: r.validFrom?.toISOString().slice(0, 10) ?? null,
    validTo: r.validTo?.toISOString().slice(0, 10) ?? null,
  }));

  const markupRule = resolveMarkupRule(rules, resolveCtx);

  const tariff = generateTariffRates(
    {
      contractId: contract.id,
      contractName: contract.name,
      contractCode: contract.code,
      hotelName: contract.hotel.name,
      rateBasis: contract.rateBasis,
      seasons: contract.seasons.map((s) => ({
        id: s.id,
        dateFrom: s.dateFrom.toISOString().slice(0, 10),
        dateTo: s.dateTo.toISOString().slice(0, 10),
      })),
      roomTypes: contract.roomTypes.map((rt) => ({
        roomTypeId: rt.roomTypeId,
        roomType: rt.roomType,
      })),
      mealBases: contract.mealBases.map((mb) => ({
        mealBasisId: mb.mealBasisId,
        mealBasis: mb.mealBasis,
      })),
      baseRates: contract.baseRates,
      supplements: contract.supplements,
    },
    { name: "", code: "" },
    markupRule,
    contract.baseCurrency.code,
  );

  return apiSuccess({
    contractId: contract.id,
    contractCode: contract.code,
    currency: contract.baseCurrency.code,
    rateBasis: contract.rateBasis,
    markupApplied: {
      ruleName: tariff.markupRuleName,
      markupType: tariff.markupType,
      markupValue: tariff.markupValue,
    },
    rates: tariff.rates,
    generatedAt: tariff.generatedAt,
  });
});
