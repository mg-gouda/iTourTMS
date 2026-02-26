import crypto from "crypto";
import type { NextRequest } from "next/server";

import { db } from "@/server/db";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function generateApiKey(companyId: string, name: string) {
  const raw = crypto.randomBytes(36).toString("base64url"); // ~48 chars
  const plain = `itms_${raw}`;
  const keyHash = hashKey(plain);
  const keyPrefix = plain.slice(0, 12); // "itms_xxxxxxx"

  const apiKey = await db.apiKey.create({
    data: {
      companyId,
      name,
      keyHash,
      keyPrefix,
    },
  });

  return { id: apiKey.id, keyPrefix, plainKey: plain };
}

export interface ApiKeyAuth {
  companyId: string;
  permissions: string[];
  keyId: string;
}

export interface ApiIntegrationAuth extends ApiKeyAuth {
  integrationId: string;
  tourOperatorId: string;
  hotelIds: string[];
}

export async function validateApiKey(
  req: NextRequest,
): Promise<ApiKeyAuth | null> {
  const header =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-api-key");

  if (!header || !header.startsWith("itms_")) return null;

  const keyHash = hashKey(header);

  const apiKey = await db.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey) return null;
  if (!apiKey.active) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update lastUsedAt in background — don't await
  db.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    companyId: apiKey.companyId,
    permissions: apiKey.permissions,
    keyId: apiKey.id,
  };
}

export async function validateApiKeyWithIntegration(
  req: NextRequest,
): Promise<ApiIntegrationAuth | null> {
  const header =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-api-key");

  if (!header || !header.startsWith("itms_")) return null;

  const keyHash = hashKey(header);

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: {
      integration: {
        include: {
          hotels: { select: { hotelId: true } },
        },
      },
    },
  });

  if (!apiKey) return null;
  if (!apiKey.active) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  if (!apiKey.integration) return null;
  if (!apiKey.integration.active) return null;

  // Update lastUsedAt in background
  db.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    companyId: apiKey.companyId,
    permissions: apiKey.permissions,
    keyId: apiKey.id,
    integrationId: apiKey.integration.id,
    tourOperatorId: apiKey.integration.tourOperatorId,
    hotelIds: apiKey.integration.hotels.map((h) => h.hotelId),
  };
}

export function requirePermission(
  permissions: string[],
  required: string,
): boolean {
  return permissions.includes(required);
}
