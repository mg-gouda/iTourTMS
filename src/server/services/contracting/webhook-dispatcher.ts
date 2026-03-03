import crypto from "crypto";

import type { PrismaClient } from "@prisma/client";

import { db as defaultDb } from "@/server/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookTarget {
  integrationId: string;
  webhookUrl: string;
  webhookSecret: string | null;
}

// ---------------------------------------------------------------------------
// Sign payload with HMAC-SHA256
// ---------------------------------------------------------------------------

function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Deliver with retry (3 attempts, exponential backoff: 1s, 4s, 9s)
// ---------------------------------------------------------------------------

async function deliverWithRetry(
  db: PrismaClient,
  target: WebhookTarget,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const maxAttempts = 3;

  const delivery = await db.webhookDelivery.create({
    data: {
      apiIntegrationId: target.integrationId,
      event,
      payload: payload as object,
      url: target.webhookUrl,
      attempts: 0,
      success: false,
    },
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
      };

      if (target.webhookSecret) {
        headers["X-Webhook-Signature"] = signPayload(body, target.webhookSecret);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(target.webhookUrl, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.text().catch(() => "");

      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts: attempt,
          lastAttemptAt: new Date(),
          httpStatus: response.status,
          responseBody: responseBody.slice(0, 2000),
          success: response.ok,
          error: response.ok ? null : `HTTP ${response.status}`,
        },
      });

      if (response.ok) return;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts: attempt,
          lastAttemptAt: new Date(),
          success: false,
          error: errorMessage.slice(0, 2000),
        },
      });
    }

    // Exponential backoff: attempt^2 seconds
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, attempt * attempt * 1000));
    }
  }
}

// ---------------------------------------------------------------------------
// Dispatch webhooks to all active integrations for a given hotel
// ---------------------------------------------------------------------------

export async function dispatchWebhooks(
  companyId: string,
  hotelId: string,
  event: string,
  payload: Record<string, unknown>,
  database?: PrismaClient,
): Promise<void> {
  const dbInstance = database ?? defaultDb;

  const integrations = await dbInstance.apiIntegration.findMany({
    where: {
      companyId,
      active: true,
      webhookUrl: { not: null },
      hotels: { some: { hotelId } },
    },
    select: {
      id: true,
      webhookUrl: true,
      webhookSecret: true,
    },
  });

  if (integrations.length === 0) return;

  // Fire in background — don't block the mutation
  const targets: WebhookTarget[] = integrations
    .filter((i): i is typeof i & { webhookUrl: string } => i.webhookUrl !== null)
    .map((i) => ({
      integrationId: i.id,
      webhookUrl: i.webhookUrl,
      webhookSecret: i.webhookSecret,
    }));

  // Run all deliveries concurrently but don't await in the caller
  Promise.allSettled(
    targets.map((t) => deliverWithRetry(dbInstance, t, event, payload)),
  ).catch(() => {});
}

// ---------------------------------------------------------------------------
// Dispatch tariff.generated webhook with full contract details + selling rates
// ---------------------------------------------------------------------------

export async function dispatchTariffWebhook(
  db: PrismaClient,
  companyId: string,
  tariffId: string,
  tariffName: string,
  contract: {
    id: string;
    name: string;
    code: string;
    hotelId: string;
    rateBasis: string;
    validFrom: Date;
    validTo: Date;
    hotel: { name: string; code?: string; starRating?: string | null };
    baseCurrency?: { code: string } | null;
    seasons: Array<{ dateFrom: Date; dateTo: Date; sortOrder?: number }>;
    roomTypes: Array<{
      roomType: { name: string; code: string };
    }>;
    mealBases: Array<{
      mealBasis: { name: string; mealCode: string };
    }>;
    allotments?: Array<{
      totalRooms: number;
      freeSale: boolean;
      basis: string;
      roomType: { name: string; code: string } | null;
      season: { dateFrom: Date; dateTo: Date } | null;
    }>;
    cancellationPolicies?: Array<{
      daysBefore: number;
      chargeType: string;
      chargeValue: { toString(): string } | number;
    }>;
    childPolicies?: Array<{
      category: string;
      ageFrom: number;
      ageTo: number;
      chargePercentage: number;
    }>;
    specialOffers?: Array<{
      name: string;
      offerType: string;
      discountType: string;
      discountValue: { toString(): string } | number;
      validFrom: Date | null;
      validTo: Date | null;
      minimumNights: number | null;
      active: boolean;
    }>;
    stopSales?: Array<{
      dateFrom: Date;
      dateTo: Date;
      reason: string | null;
      roomType: { name: string; code: string } | null;
    }>;
    markets?: Array<{
      market?: { name: string; code: string } | null;
      marketId: string;
    }>;
  },
  tariffData: {
    rates?: Array<{
      seasonLabel: string;
      roomTypeName: string;
      roomTypeCode: string;
      mealBasisName: string;
      mealCode: string;
      baseRate: number;
      markup: number;
      sellingRate: number;
    }>;
    rateBasis?: string;
  },
): Promise<void> {
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  // Build selling rates — strip baseRate, markup, markupType, markupValue
  const sellingRates = (tariffData.rates ?? []).map((r) => ({
    seasonLabel: r.seasonLabel,
    roomTypeName: r.roomTypeName,
    roomTypeCode: r.roomTypeCode,
    mealBasisName: r.mealBasisName,
    mealCode: r.mealCode,
    sellingRate: r.sellingRate,
    perNight: (tariffData.rateBasis ?? contract.rateBasis) === "PER_PERSON" ? false : true,
  }));

  const payload: Record<string, unknown> = {
    tariffId,
    tariffName,
    contract: {
      id: contract.id,
      name: contract.name,
      code: contract.code,
      validFrom: formatDate(contract.validFrom),
      validTo: formatDate(contract.validTo),
      rateBasis: contract.rateBasis,
      currency: contract.baseCurrency?.code ?? "USD",
      hotel: {
        name: contract.hotel.name,
        code: contract.hotel.code ?? null,
        starRating: contract.hotel.starRating ?? null,
      },
      seasons: contract.seasons.map((s) => ({
        dateFrom: formatDate(s.dateFrom),
        dateTo: formatDate(s.dateTo),
      })),
      roomTypes: contract.roomTypes.map((rt) => ({
        name: rt.roomType.name,
        code: rt.roomType.code,
      })),
      mealBases: contract.mealBases.map((mb) => ({
        name: mb.mealBasis.name,
        mealCode: mb.mealBasis.mealCode,
      })),
      allotments: (contract.allotments ?? []).map((a) => ({
        roomType: a.roomType?.name ?? null,
        totalRooms: a.totalRooms,
        basis: a.basis,
      })),
      cancellationPolicies: (contract.cancellationPolicies ?? []).map((cp) => ({
        daysBefore: cp.daysBefore,
        chargeType: cp.chargeType,
        chargeValue: Number(cp.chargeValue),
      })),
      childPolicies: (contract.childPolicies ?? []).map((cp) => ({
        category: cp.category,
        ageFrom: cp.ageFrom,
        ageTo: cp.ageTo,
        chargePercentage: Number(cp.chargePercentage),
      })),
      specialOffers: (contract.specialOffers ?? []).map((so) => ({
        name: so.name,
        offerType: so.offerType,
        discountType: so.discountType,
        discountValue: so.discountValue != null ? Number(so.discountValue) : null,
        validFrom: so.validFrom ? formatDate(so.validFrom) : null,
        validTo: so.validTo ? formatDate(so.validTo) : null,
        minimumNights: so.minimumNights,
        active: so.active,
      })),
      stopSales: (contract.stopSales ?? []).map((ss) => ({
        roomType: ss.roomType?.name ?? null,
        dateFrom: formatDate(ss.dateFrom),
        dateTo: formatDate(ss.dateTo),
        reason: ss.reason,
      })),
    },
    sellingRates,
    generatedAt: new Date().toISOString(),
  };

  dispatchWebhooks(companyId, contract.hotelId, "tariff.generated", payload, db);
}

// ---------------------------------------------------------------------------
// Helper: dispatch webhook only if the contract is PUBLISHED
// ---------------------------------------------------------------------------

export async function maybeDispatchContractWebhook(
  db: PrismaClient,
  companyId: string,
  contractId: string,
  event: string,
  extraPayload: Record<string, unknown> = {},
): Promise<void> {
  const contract = await db.contract.findFirst({
    where: { id: contractId, companyId, status: "PUBLISHED" },
    select: { id: true, code: true, name: true, hotelId: true },
  });

  if (!contract) return;

  dispatchWebhooks(companyId, contract.hotelId, event, {
    contractId: contract.id,
    contractCode: contract.code,
    contractName: contract.name,
    hotelId: contract.hotelId,
    ...extraPayload,
  });
}
