import { initTRPC, TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import superjson from "superjson";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { redis } from "@/server/redis";

export async function createTRPCContext(opts?: { session?: Session | null }) {
  const session = opts?.session !== undefined ? opts.session : await auth();

  return {
    db,
    redis,
    session,
    logger,
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

// Permission-scoped: session + specific permission
export const permissionProcedure = (permissionCode: string) =>
  t.procedure
    .use(loggerMiddleware)
    .use(authMiddleware)
    .use(permissionMiddleware(permissionCode));
