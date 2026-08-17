import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

/** Match the rest of the codebase; 10 also made the login decoy-hash timing uneven. */
const PASSWORD_COST = 12;

/**
 * These endpoints manage PARTNER logins only. Without both predicates a caller
 * holding an ordinary b2b-portal permission could reset the password of any
 * user in any tenant — including another company's super_admin.
 */
const partnerUserScope = (companyId: string, id: string) => ({
  id,
  companyId,
  tourOperatorId: { not: null },
});

/** Drop the cached token/permission entries so a revoked session dies now, not in 60s. */
async function invalidateUserSession(
  redis: { connect: () => Promise<unknown>; del: (...keys: string[]) => Promise<unknown> },
  userId: string,
): Promise<void> {
  try {
    await redis.connect().catch(() => {});
    await redis.del(`tv:${userId}`, `perms:${userId}`);
  } catch {
    // Redis unavailable — the cache entries expire on their own within 60s.
  }
}

export const partnerUserRouter = createTRPCRouter({
  list: p("b2b-portal:partnerUser:read")
    .input(z.object({ tourOperatorId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          companyId: ctx.companyId,
          tourOperatorId: input?.tourOperatorId ?? { not: null },
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          tourOperator: { select: { id: true, name: true, code: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: p("b2b-portal:partnerUser:create")
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        tourOperatorId: z.string().min(1),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(input.password, PASSWORD_COST);

      // The operator must be ours, or this attaches a login to another
      // tenant's partner.
      const operator = await ctx.db.tourOperator.findFirst({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!operator) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });

      const existing = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (existing)
        throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });

      return ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hash,
          companyId: ctx.companyId,
          tourOperatorId: input.tourOperatorId,
          isActive: input.isActive,
        },
      });
    }),

  toggleActive: p("b2b-portal:partnerUser:update")
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.user.updateMany({
        where: partnerUserScope(ctx.companyId, input.id),
        data: { isActive: input.isActive, tokenVersion: { increment: 1 } },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      await invalidateUserSession(ctx.redis, input.id);
      return { id: input.id, isActive: input.isActive };
    }),

  resetPassword: p("b2b-portal:partnerUser:manage")
    .input(z.object({ id: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(input.newPassword, PASSWORD_COST);

      // updateMany, not update: `update` would ignore the extra predicates on
      // some drivers and rewrite the row anyway. A foreign id must touch zero
      // rows, not the wrong one.
      const { count } = await ctx.db.user.updateMany({
        where: partnerUserScope(ctx.companyId, input.id),
        // Bump so the old JWT stops validating — a password reset that leaves
        // live sessions running is not a reset.
        data: { password: hash, tokenVersion: { increment: 1 } },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      await invalidateUserSession(ctx.redis, input.id);
      return { id: input.id };
    }),
});
