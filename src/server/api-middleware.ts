import type { NextRequest } from "next/server";

import {
  validateApiKeyWithIntegration,
  requirePermission,
  type ApiIntegrationAuth,
} from "@/server/api-auth";
import { checkRateLimit, setRateLimitHeaders } from "@/server/api-rate-limit";
import { apiError } from "@/server/api-response";
import { logger } from "@/lib/logger";

type ApiHandler = (
  req: NextRequest,
  auth: ApiIntegrationAuth,
) => Promise<Response>;

export function withApiAuth(
  handler: ApiHandler,
  permission = "contracting:read",
) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      // 1. Authenticate
      const auth = await validateApiKeyWithIntegration(req);
      if (!auth) {
        return apiError("UNAUTHORIZED", "Invalid or missing API key", 401);
      }

      // 2. Check permission
      if (!requirePermission(auth.permissions, permission)) {
        return apiError("FORBIDDEN", "Insufficient permissions", 403);
      }

      // 3. Rate limit
      const rl = await checkRateLimit(auth.keyId);
      if (!rl.allowed) {
        const res = apiError(
          "RATE_LIMITED",
          "Too many requests. Please retry after the reset window.",
          429,
        );
        setRateLimitHeaders(res.headers, rl);
        return res;
      }

      // 4. Call handler
      const response = await handler(req, auth);
      setRateLimitHeaders(response.headers, rl);
      return response;
    } catch (err) {
      logger.error({ err }, "API unhandled error");
      return apiError(
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        500,
      );
    }
  };
}
