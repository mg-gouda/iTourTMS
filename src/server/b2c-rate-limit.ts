import { NextResponse } from "next/server";

import { redis } from "@/server/redis";

/**
 * B2C-specific rate limiting with configurable windows per endpoint type.
 * Uses Redis sliding window counter.
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const CONFIGS: Record<string, RateLimitConfig> = {
  contact: { windowMs: 15 * 60_000, maxRequests: 5 },              // 5 per 15 min
  newsletter: { windowMs: 15 * 60_000, maxRequests: 5 },           // 5 per 15 min
  booking: { windowMs: 5 * 60_000, maxRequests: 10 },              // 10 per 5 min
  search: { windowMs: 60_000, maxRequests: 30 },                    // 30 per min
  myBookings: { windowMs: 60_000, maxRequests: 15 },                // 15 per min
  marketCheck: { windowMs: 60_000, maxRequests: 30 },               // 30 per min
  "transfer-enquiry": { windowMs: 15 * 60_000, maxRequests: 5 },   // 5 per 15 min
  "activity-enquiry": { windowMs: 15 * 60_000, maxRequests: 5 },   // 5 per 15 min
};

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function b2cRateLimit(
  request: Request,
  endpoint: string,
): Promise<NextResponse | null> {
  const config = CONFIGS[endpoint];
  if (!config) return null;

  const ip = getClientIp(request);
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const redisKey = `b2c_rl:${endpoint}:${ip}`;

  try {
    await redis.connect().catch(() => {});

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
    pipeline.zcard(redisKey);
    pipeline.pexpire(redisKey, config.windowMs);

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    if (count > config.maxRequests) {
      const resetAt = Math.ceil((now + config.windowMs) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(config.windowMs / 1000)),
            "X-RateLimit-Limit": String(config.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetAt),
          },
        },
      );
    }
  } catch {
    // If Redis is down, allow the request (fail-open)
  }

  return null;
}
