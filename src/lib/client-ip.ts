/**
 * Resolve the caller's IP for rate-limiting keys.
 *
 * `X-Forwarded-For` is a list the client can seed: nginx appends the real peer
 * with `$proxy_add_x_forwarded_for`, so anything the client sent stays to the
 * LEFT of the value our own proxy added. Reading the leftmost entry therefore
 * lets a caller mint a fresh identity per request and walk straight through any
 * limit — so we read the RIGHTMOST entry, which only a trusted hop can write.
 */
export function getClientIp(source: Request | Headers): string {
  const headers = source instanceof Headers ? source : source.headers;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1]!;
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}
