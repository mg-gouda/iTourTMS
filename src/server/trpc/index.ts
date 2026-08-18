import { initTRPC, TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import superjson from "superjson";

import { auth } from "@/lib/auth";
import { getClientIp } from "@/lib/client-ip";
import type { PartnerRole } from "@prisma/client";
import { partnerAuth } from "@/lib/auth-partner";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { redis } from "@/server/redis";

export async function createTRPCContext(opts?: {
  session?: Session | null;
  headers?: Headers;
}) {
  const session = opts?.session !== undefined ? opts.session : await auth();

  return {
    db,
    redis,
    session,
    logger,
    // Needed by the unauthenticated procedures that have to rate-limit per
    // caller (see setup.activateLicense). Null when it can't be established.
    clientIp: opts?.headers ? getClientIp(opts.headers) : null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: null,
      },
    };
  },
});

// Middleware: Logging
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  if (result.ok) {
    logger.info({ path, type, duration }, "tRPC OK");
  } else {
    logger.error({ path, type, duration, error: result.error }, "tRPC Error");
  }

  return result;
});

// Middleware: Require authenticated session
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // External B2B partner logins are ordinary User rows in the tenant, which
  // meant every protectedProcedure was open to them — company settings, API
  // keys, finance, the lot. Partners have their own surface (partnerProcedure,
  // partner realm), so the staff surface is shut to them here rather than
  // per-router.
  if (ctx.session.user.tourOperatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not available to partner accounts" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

// Middleware: Require the super_admin role. Used for tenant-wide administrative
// surface (API keys, company settings, module install) where no granular
// permission code exists and "any authenticated user" is far too broad.
const adminMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!ctx.session.user.roles?.includes("super_admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access required" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

// Middleware: Verify license is active and not expired
const licenseMiddleware = t.middleware(async ({ ctx, next }) => {
  const companyId = ctx.session?.user?.companyId;
  if (!companyId) return next();

  // Check Redis cache first (5-minute TTL)
  const cacheKey = `license:valid:${companyId}`;
  try {
    await ctx.redis.connect().catch(() => {});
    const cached = await ctx.redis.get(cacheKey);
    if (cached === "1") return next();
    if (cached === "0") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "License expired or invalid. Please renew your license.",
      });
    }
  } catch (e) {
    if (e instanceof TRPCError) throw e;
    // Redis unavailable — fall through to DB check
  }

  const license = await ctx.db.license.findFirst({
    where: { companyId, isActivated: true },
    select: { expiresAt: true, isRevoked: true },
  });

  const isValid =
    !!license &&
    !license.isRevoked &&
    !!license.expiresAt &&
    license.expiresAt > new Date();

  // Cache result for 5 minutes
  try {
    await ctx.redis.setex(cacheKey, 300, isValid ? "1" : "0");
  } catch {
    // Redis unavailable — ignore
  }

  if (!isValid) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "License expired or invalid. Please renew your license.",
    });
  }

  return next();
});

// Middleware: Require specific module to be installed
const moduleMiddleware = (moduleName: string) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const companyId = ctx.session.user.companyId;
    if (!companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No company associated",
      });
    }

    const installed = await ctx.db.installedModule.findUnique({
      where: {
        name_companyId: { name: moduleName, companyId },
      },
    });

    if (!installed?.isInstalled) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Module not installed: ${moduleName}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        user: ctx.session.user,
        companyId,
      },
    });
  });

// Middleware: Require specific permission
const permissionMiddleware = (permissionCode: string) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const { roles, permissions } = ctx.session.user;

    // Super admin bypasses all checks
    if (!roles?.includes("super_admin") && !permissions?.includes(permissionCode)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Missing permission: ${permissionCode}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        user: ctx.session.user,
      },
    });
  });

// Router and procedure builders
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Public: no auth required
export const publicProcedure = t.procedure.use(loggerMiddleware);

// Protected: session required + license valid
export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(authMiddleware)
  .use(licenseMiddleware);

// Module-scoped: session + module installed
export const moduleProcedure = (moduleName: string) =>
  t.procedure
    .use(loggerMiddleware)
    .use(authMiddleware)
    .use(moduleMiddleware(moduleName));

// Admin-only: session + super_admin role. For tenant-wide config with no
// granular permission code (API keys, company settings, module install).
export const adminProcedure = t.procedure
  .use(loggerMiddleware)
  .use(authMiddleware)
  .use(licenseMiddleware)
  .use(adminMiddleware);

// Permission-scoped: session + specific permission
export const permissionProcedure = (permissionCode: string) =>
  t.procedure
    .use(loggerMiddleware)
    .use(authMiddleware)
    .use(permissionMiddleware(permissionCode));

// Module + Permission: session + module installed + specific permission
export const modulePermissionProcedure = (moduleName: string, permissionCode: string) =>
  t.procedure
    .use(loggerMiddleware)
    .use(authMiddleware)
    .use(licenseMiddleware)
    .use(moduleMiddleware(moduleName))
    .use(permissionMiddleware(permissionCode));

// ── B2B partner portal ──────────────────────────────────────────────────────

/**
 * The real boundary for the partner portal.
 *
 * The edge only proves a partner cookie exists and the layout only guards
 * pages; this guards data. It reads the *partner* realm — never `ctx.session`,
 * which belongs to staff and is still sent on /b2b requests — resolves the
 * partner from the token rather than from anything the client passes, and
 * hands routers a `partner` context they must scope every query by.
 */
const partnerMiddleware = t.middleware(async ({ ctx, next }) => {
  const session = await partnerAuth();
  const user = session?.user as
    | { id: string; realm?: string; tourOperatorId?: string | null; companyId?: string | null; partnerRole?: string | null }
    | undefined;

  if (!user?.id || user.realm !== "partner" || !user.tourOperatorId || !user.companyId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Access can be revoked mid-session, so confirm against the database rather
  // than trusting a token minted up to four hours ago.
  const partner = await ctx.db.tourOperator.findFirst({
    where: {
      id: user.tourOperatorId,
      companyId: user.companyId,
      active: true,
      portalEnabled: true,
    },
    select: { id: true, companyId: true, name: true, bookingValueCap: true },
  });

  if (!partner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Portal access is not enabled" });
  }

  return next({
    ctx: {
      ...ctx,
      partner: {
        userId: user.id,
        tourOperatorId: partner.id,
        companyId: partner.companyId,
        name: partner.name,
        role: (user.partnerRole ?? "PARTNER_AGENT") as PartnerRole,
        bookingValueCap: partner.bookingValueCap,
      },
    },
  });
});

export const partnerProcedure = t.procedure.use(loggerMiddleware).use(partnerMiddleware);

/** Narrows a partner procedure to specific roles, e.g. admin-only user management. */
export const partnerRoleProcedure = (...roles: PartnerRole[]) =>
  partnerProcedure.use(async ({ ctx, next }) => {
    if (!roles.includes(ctx.partner.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your portal role does not allow this",
      });
    }
    return next({ ctx });
  });
