import { lookup } from "node:dns/promises";

/**
 * Guard for URLs that a user supplies and the server then fetches.
 *
 * Without this, "set your webhook URL" is a full-read SSRF primitive: the
 * caller points it at http://169.254.169.254/ or an internal host, we fetch it
 * from inside the network, and the response body is stored on the delivery
 * record where they can read it back.
 *
 * Residual risk: DNS rebinding. We resolve here and fetch() resolves again, so
 * a hostname whose record flips between the two can still slip through. Closing
 * that needs a dispatcher pinned to the validated IP; this blocks every direct
 * form (literal IPs, localhost, .internal names, the metadata endpoint).
 */

/** Ranges that must never be reachable from a user-supplied URL. */
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts as [number, number, number, number];

  return (
    a === 0 || // this network
    a === 10 || // RFC1918
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // RFC1918
    (a === 192 && b === 168) || // RFC1918
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast + reserved
  );
}

function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === "::" || addr === "::1") return true;
  // IPv4-mapped (::ffff:10.0.0.1) — judge on the embedded v4 address.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]!);
  return (
    addr.startsWith("fc") || // unique local
    addr.startsWith("fd") ||
    addr.startsWith("fe80") // link-local
  );
}

export function isBlockedAddress(ip: string, family: number): boolean {
  return family === 4 ? isBlockedIpv4(ip) : isBlockedIpv6(ip);
}

/**
 * Throws unless `raw` is an http(s) URL whose hostname resolves entirely to
 * public addresses. Call at save time AND at dispatch time — a stored URL can
 * be re-pointed after it was accepted.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Webhook URL is not a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Webhook URL must use http or https");
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    throw new Error("Webhook URL hostname does not resolve");
  }

  if (addresses.length === 0) throw new Error("Webhook URL hostname does not resolve");

  for (const { address, family } of addresses) {
    if (isBlockedAddress(address, family)) {
      throw new Error("Webhook URL must point to a public address");
    }
  }

  return url;
}
