import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Set to "cloudflare" or "vercel" only when the app genuinely sits behind that
 * platform, so its geo header can be believed. Anything else and geo falls back
 * to the server-side IP lookup in src/lib/b2c/geo-ip.ts.
 */
const TRUSTED_GEO_PLATFORM = !!process.env.TRUSTED_GEO_PLATFORM;

/**
 * Geo headers are trusted downstream, so they must be derived here and never
 * accepted from the client. Returns request headers with `x-geo-country`
 * stripped and re-set only from a platform-provided value.
 */
function geoHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("x-geo-country");

  // cf-ipcountry only means anything when Cloudflare is actually in front,
  // because Cloudflare overwrites any inbound copy. This deployment terminates
  // on its own nginx, which does not strip it — so unless the platform is
  // declared, the header is just attacker-supplied text and trusting it hands
  // the caller their choice of market and pricing.
  const country = TRUSTED_GEO_PLATFORM
    ? request.headers.get("cf-ipcountry") ||
      (request as unknown as { geo?: { country?: string } }).geo?.country ||
      null
    : null;
  if (country) headers.set("x-geo-country", country);

  return headers;
}

/**
 * Edge-compatible middleware — no next-auth or Prisma imports.
 * Only checks for the JWT session cookie to redirect unauthenticated users.
 * Actual JWT verification happens server-side in the auth callbacks / tRPC.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const headers = geoHeaders(request);

  // Allow public API & auth routes. Each of these authenticates itself:
  // /api/trpc via the tRPC middleware chain, /api/v1 via API key, /api/upload
  // and /api/cron via their own handlers.
  const publicPaths = [
    "/login",
    "/api/auth",
    // The partner realm's own endpoints. Reaching them must not require a
    // staff session — they are how a partner gets a session in the first
    // place, and everything under it checks the partner session itself.
    "/api/b2b",
    "/api/health",
    "/api/trpc",
    "/api/upload",
    "/api/v1",
    "/api/b2c",
    "/api/cron",
  ];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers } });
  }

  // Allow setup route (no auth needed for first-run)
  if (pathname.startsWith("/setup")) {
    return NextResponse.next({ request: { headers } });
  }

  // Allow license pages (expired / activate)
  if (pathname.startsWith("/license-expired") || pathname.startsWith("/license-activate")) {
    return NextResponse.next({ request: { headers } });
  }

  // Allow B2C website routes (served by (b2c) route group)
  const b2cSiteRoutes = [
    "/hotels",
    "/hotel",
    "/search",
    "/booking",
    "/my-bookings",
    "/about",
    "/contact",
    "/faq",
    "/blog",
    "/reviews",
    "/destinations",
    "/destination",
    "/packages",
    "/activities",
    "/transfers",
    "/page",
  ];
  if (
    pathname === "/" ||
    b2cSiteRoutes.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next({ request: { headers } });
  }

  // ── B2B partner portal ────────────────────────────────────────────────────
  // The portal shares this domain with the staff app, so the staff cookie is
  // sent here too. This gate deliberately looks only for the partner cookie:
  // a staff session must not open a partner page. Deeper checks (realm, portal
  // enabled, terms, 2FA) run in the (b2b) layout and in partnerProcedure.
  if (pathname === "/b2b" || pathname.startsWith("/b2b/")) {
    const isPublicPartnerRoute =
      pathname === "/b2b/login" ||
      pathname === "/b2b/enrol" ||
      pathname.startsWith("/b2b/invite/");
    if (isPublicPartnerRoute) {
      return NextResponse.next({ request: { headers } });
    }

    const hasPartnerCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("itms-partner.session-token"));

    if (!hasPartnerCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/b2b/login";
      url.search = `?callbackUrl=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers } });
  }

  // Check for session token (next-auth v5 JWT cookie).
  // Auth.js chunks large JWTs into authjs.session-token.0 / .1 / .2 etc.
  // when the payload exceeds the 4 KB cookie limit (happens when the JWT
  // carries many permission codes). We only need existence, not validity.
  const token =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("authjs.session-token.0") ??
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token.0") ??
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("next-auth.session-token.0") ??
    request.cookies.get("__Secure-next-auth.session-token") ??
    request.cookies.get("__Secure-next-auth.session-token.0");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Static files under public/ must never reach the gate below. They are not
  // pages, so redirecting one to /login does not prompt anybody to sign in —
  // it just returns HTML where an image was expected. That is how every
  // screenshot in the partner manual broke for partners, who hold no staff
  // cookie: the PNG 307'd to /login and the image optimiser then 400'd on it.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|css|js|map|txt|woff|woff2|ttf|otf)$).*)",
  ],
};
