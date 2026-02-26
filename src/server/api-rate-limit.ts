import { redis } from "@/server/redis";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix timestamp in seconds
}

export async function checkRateLimit(keyId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const redisKey = `api_rl:${keyId}`;

  await redis.connect().catch(() => {}); // ensure connected (lazyConnect)

  const pipeline = redis.pipeline();
  // Remove old entries outside the sliding window
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  // Add current request
  pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
  // Count requests in window
  pipeline.zcard(redisKey);
  // Set TTL so keys auto-expire
  pipeline.pexpire(redisKey, WINDOW_MS);

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) ?? 0;

  const resetAt = Math.ceil((now + WINDOW_MS) / 1000);

  return {
    allowed: count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - count),
    resetAt,
  };
}

export function setRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
) {
  headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.resetAt));
}
