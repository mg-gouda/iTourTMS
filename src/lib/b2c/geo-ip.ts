// Simple in-memory cache for IP → country lookups
const cache = new Map<string, { code: string | null; expiry: number }>();
const TTL = 60 * 60 * 1000; // 1 hour

/**
 * Look up the ISO alpha-2 country code for an IP address.
 * Uses ip-api.com free tier (no key needed, 45 req/min limit).
 * Only called when platform headers (cf-ipcountry, Vercel geo) are unavailable.
 */
export async function getCountryFromIP(ip: string): Promise<string | null> {
  // Skip private / loopback IPs
  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.")
  ) {
    return null;
  }

  const cached = cache.get(ip);
  if (cached && cached.expiry > Date.now()) {
    return cached.code;
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,countryCode`,
      { signal: AbortSignal.timeout(3000) },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as { status: string; countryCode?: string };
    const code = data.status === "success" && data.countryCode ? data.countryCode : null;

    cache.set(ip, { code, expiry: Date.now() + TTL });
    return code;
  } catch {
    return null;
  }
}
