import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge-compatible middleware — no next-auth or Prisma imports.
 * Only checks for the JWT session cookie to redirect unauthenticated users.
 * Actual JWT verification happens server-side in the auth callbacks / tRPC.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API & auth routes
  const publicPaths = [
    "/login",
    "/api/auth",
    "/api/health",
    "/api/trpc",
    "/api/upload",
    "/api/v1",
    "/api/b2c",
  ];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow setup route (no auth needed for first-run)
  if (pathname.startsWith("/setup")) {
    return NextResponse.next();
  }

  // Allow B2C website routes (served by (b2c) route group)
  const b2cSiteRoutes = [
    "/hotels",
    "/hotel",
    "/search",
    "/booking",
    "/b2b",
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
    // Detect visitor country from platform headers and forward downstream
    const country =
      request.headers.get("cf-ipcountry") || // Cloudflare
      (request as any).geo?.country || // Vercel
      null;

    const response = NextResponse.next();
    if (country) {
      response.headers.set("x-geo-country", country);
    }
    return response;
  }

  // Check for session token (next-auth v5 JWT cookie)
  const token =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("__Secure-next-auth.session-token");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
