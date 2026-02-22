import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  const publicPaths = ["/login", "/api/auth", "/api/health", "/api/trpc"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return;
  }

  // Allow setup route (no auth needed for first-run)
  if (pathname.startsWith("/setup")) {
    return;
  }

  // Require auth for everything else
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
