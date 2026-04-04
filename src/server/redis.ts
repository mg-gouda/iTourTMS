import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/**
 * Cache helper — fetch from Redis cache or compute and store.
 * Falls back to direct computation if Redis is unavailable.
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = 300,
): Promise<T> {
  try {
    await redis.connect().catch(() => {});
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;

    const result = await fn();
    await redis.setex(key, ttlSeconds, JSON.stringify(result));
    return result;
  } catch {
    // Redis unavailable — compute directly
    return fn();
  }
}

/**
 * Invalidate a cache key or pattern.
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.connect().catch(() => {});
    await redis.del(key);
  } catch {
    // Redis unavailable — ignore
  }
}
