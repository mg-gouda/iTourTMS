import crypto from "crypto";
import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/server/api-response";
import { db } from "@/server/db";

/**
 * POST /api/v1/webhooks/receive/{token}
 *
 * Inbound webhook endpoint. Tour operators POST signed payloads here.
 *
 * Signature verification:
 *   x-webhook-signature: HMAC-SHA256(webhookSecret, rawBody)
 *
 * The token is the last path segment of the webhookUrl stored on ApiIntegration.
 * We look up the integration by matching webhookUrl ending with the token.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 16) {
    return apiError("NOT_FOUND", "Invalid webhook token", 404);
  }

  // Read raw body (needed for signature verification)
  const rawBody = await req.text();

  // Find integration by webhook URL token
  const integration = await db.apiIntegration.findFirst({
    where: {
      webhookUrl: { endsWith: token },
      active: true,
    },
    select: {
      id: true,
      webhookSecret: true,
    },
  });

  if (!integration) {
    return apiError("NOT_FOUND", "Webhook endpoint not found", 404);
  }

  // Verify HMAC signature if a secret is configured
  let verified = false;
  if (integration.webhookSecret) {
    const signature = req.headers.get("x-webhook-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", integration.webhookSecret)
      .update(rawBody)
      .digest("hex");
    verified = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );

    if (!verified) {
      // Log the failed attempt but still return 401
      await db.incomingWebhook.create({
        data: {
          apiIntegrationId: integration.id,
          event: null,
          payload: (rawBody ? tryParseJson(rawBody) : {}) as Parameters<typeof db.incomingWebhook.create>[0]["data"]["payload"],
          verified: false,
          ipAddress: req.headers.get("x-forwarded-for") ?? null,
        },
      });
      return apiError("UNAUTHORIZED", "Webhook signature verification failed", 401);
    }
  } else {
    // No secret configured — accept but mark as unverified
    verified = false;
  }

  // Parse payload
  const payload = tryParseJson(rawBody);
  const event =
    typeof payload === "object" && payload !== null && "event" in payload
      ? String((payload as Record<string, unknown>).event)
      : null;

  // Log the incoming webhook
  await db.incomingWebhook.create({
    data: {
      apiIntegrationId: integration.id,
      event,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: payload as any,
      verified,
      ipAddress: req.headers.get("x-forwarded-for") ?? null,
    },
  });

  return apiSuccess({ received: true, event, verified });
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}
