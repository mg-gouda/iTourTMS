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
