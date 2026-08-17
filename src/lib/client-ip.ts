/** Loopback, link-local and RFC1918 ranges, v4 and v6. */
const PRIVATE_IP =
  /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80:)/i;

/**
 * Resolve the caller's public IP for rate-limiting keys.
 *
 * Both naive readings of `X-Forwarded-For` are wrong here:
 *   - LEFTMOST is client-controlled. nginx appends with
 *     `$proxy_add_x_forwarded_for`, so anything the caller sent stays to the
 *     left and they can mint a fresh identity per request.
 *   - RIGHTMOST is written by our own innermost proxy. This deployment runs
 *     two nginx layers (host TLS terminator -> container nginx -> app), so the
 *     last hop is the docker bridge gateway: a constant that collapses every
 *     caller into one bucket.
 *
 * So walk the chain right-to-left and take the first address that isn't ours.
 * Every hop our infrastructure appended is private and gets skipped; the first
 * public value is the real client. A spoofed entry sits further left than the
 * address the proxy appended, so it is never reached.
 *
 * Returns null when no public address can be established (direct local
 * connections in dev). Callers must decide what an unknown origin means rather
 * than silently sharing one bucket.
 */
export function getClientIp(source: Request | Headers): string | null {
  const headers = source instanceof Headers ? source : source.headers;

  const candidates = [
    // Set from $remote_addr, so it is already the real client wherever
    // nginx's real_ip module is configured.
    headers.get("x-real-ip"),
    ...(headers.get("x-forwarded-for") ?? "").split(",").reverse(),
  ];

  for (const candidate of candidates) {
    const ip = candidate?.trim();
    if (ip && !PRIVATE_IP.test(ip)) return ip;
  }

  return null;
}
