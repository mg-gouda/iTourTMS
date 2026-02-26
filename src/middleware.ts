import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge-compatible middleware — no next-auth or Prisma imports.
 * Only checks for the JWT session cookie to redirect unauthenticated users.
 * Actual JWT verification happens server-side in the auth callbacks / tRPC.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicPaths = ["/login", "/api/auth", "/api/health", "/api/trpc", "/api/upload", "/api/v1"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow setup route (no auth needed for first-run)
  if (pathname.startsWith("/setup")) {
    return NextResponse.next();
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
