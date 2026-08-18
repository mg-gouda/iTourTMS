import { TRPCError } from "@trpc/server";
import { PartnerRole } from "@prisma/client";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { hashPassword } from "@/lib/password";

const partnerRole = z.nativeEnum(PartnerRole);

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

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
          partnerRole: true,
          twoFactorEnabled: true,
          mustSetPassword: true,
          lockedUntil: true,
          tourOperator: {
            select: { id: true, name: true, code: true, portalEnabled: true },
          },
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
        /** Omit to create an invite-only login: the partner sets their own. */
        password: z.string().min(12).optional(),
        partnerRole: partnerRole.default("PARTNER_AGENT"),
        tourOperatorId: z.string().min(1),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // The operator must be ours, or this attaches a login to another
      // tenant's partner.
      const operator = await ctx.db.tourOperator.findFirst({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!operator) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });

      // Stored lower-case so the portal's sign-in always finds the row,
      // whatever capitalisation the partner types.
      const email = input.email.trim().toLowerCase();
      const existing = await ctx.db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (existing)
        throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });

      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email,
          password: input.password ? await hashPassword(input.password) : null,
          partnerRole: input.partnerRole,
          mustSetPassword: !input.password,
          companyId: ctx.companyId,
          tourOperatorId: input.tourOperatorId,
          isActive: input.isActive,
        },
        select: { id: true, name: true, email: true, partnerRole: true, isActive: true },
      });

      await auditPartner("USER_CREATED", {
        companyId: ctx.companyId,
        tourOperatorId: input.tourOperatorId,
        userId: user.id,
        ip: ctx.clientIp,
        metadata: { role: input.partnerRole, byStaffId: ctx.user.id },
      });

      return user;
    }),

  /** Changes what a partner user may do inside the portal. */
  setRole: p("b2b-portal:partnerUser:update")
    .input(z.object({ id: z.string(), partnerRole }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.user.updateMany({
        where: partnerUserScope(ctx.companyId, input.id),
        // The role rides in the session token, so the old one must stop working.
        data: { partnerRole: input.partnerRole, tokenVersion: { increment: 1 } },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      await invalidateUserSession(ctx.redis, input.id);

      await auditPartner("USER_UPDATED", {
        companyId: ctx.companyId,
        userId: input.id,
        ip: ctx.clientIp,
        metadata: { role: input.partnerRole, byStaffId: ctx.user.id },
      });

      return { id: input.id, partnerRole: input.partnerRole };
    }),

  /**
   * Clears the authenticator after a lost phone. The account cannot sign in
   * again until it enrols a new one at /b2b/enrol — 2FA is not optional here,
   * so this is a re-enrolment, not a bypass.
   */
  resetTwoFactor: p("b2b-portal:partnerUser:manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.user.updateMany({
        where: partnerUserScope(ctx.companyId, input.id),
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: [],
          tokenVersion: { increment: 1 },
        },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      await invalidateUserSession(ctx.redis, input.id);

      await auditPartner("TWO_FACTOR_RESET", {
        companyId: ctx.companyId,
        userId: input.id,
        ip: ctx.clientIp,
        metadata: { byStaffId: ctx.user.id },
      });

      return { id: input.id };
    }),

  /** Lets a locked-out partner back in before the 30 minutes are up. */
  unlock: p("b2b-portal:partnerUser:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.user.updateMany({
        where: partnerUserScope(ctx.companyId, input.id),
        data: { lockedUntil: null, failedLoginCount: 0 },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
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

      if (!input.isActive) {
        await auditPartner("USER_DEACTIVATED", {
          companyId: ctx.companyId,
          userId: input.id,
          ip: ctx.clientIp,
          metadata: { byStaffId: ctx.user.id },
        });
      }

      return { id: input.id, isActive: input.isActive };
    }),

  resetPassword: p("b2b-portal:partnerUser:manage")
    .input(z.object({ id: z.string(), newPassword: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const hash = await hashPassword(input.newPassword);

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
