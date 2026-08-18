import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import qrcode from "qrcode-generator";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { partnerIpThrottled, recordPartnerIpFailure } from "@/lib/auth-partner";
import { hashPassword } from "@/lib/password";
import { createTotp, generateBackupCodes, hashBackupCode, verifyTotp } from "@/lib/totp";
import { createTRPCRouter, partnerProcedure, publicProcedure } from "@/server/trpc";

/**
 * Everything a partner does *before* they have a session: accepting an invite,
 * setting the first password, enrolling the authenticator that this realm
 * insists on. These are public endpoints, so each one re-proves identity — the
 * invite token, or the password — on every call, and feeds the same per-IP
 * failure counter the login uses.
 */

/** Partner passwords are longer than staff's: these logins reach money. */
const partnerPassword = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), {
    message: "Include an upper-case letter, a lower-case letter and a number",
  });

const inviteToken = z.string().min(20).max(200);
const email = z.string().email().max(255);

export const hashInviteToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const GENERIC_FAILURE = "That did not work. Check the details and try again.";

/**
 * Resolves the account behind an email + password pair, or throws the same
 * error for every kind of failure so these endpoints cannot be used to learn
 * which addresses exist or which are partners.
 */
async function requirePartnerCredentials(
  db: typeof import("@/server/db").db,
  ip: string | null,
  input: { email: string; password: string },
) {
  if (await partnerIpThrottled(ip)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again later." });
  }

  const address = input.email.trim().toLowerCase();
  const user = await db.user.findFirst({
    where: {
      OR: [{ email: address }, { email: { equals: address, mode: "insensitive" as const } }],
      tourOperatorId: { not: null },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      companyId: true,
      tourOperatorId: true,
      partnerRole: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      tourOperator: { select: { active: true, portalEnabled: true } },
    },
  });

  const ok =
    !!user?.password &&
    !!user.companyId &&
    !!user.tourOperatorId &&
    !!user.partnerRole &&
    !!user.tourOperator?.active &&
    !!user.tourOperator.portalEnabled &&
    (await bcrypt.compare(input.password, user.password));

  if (!ok || !user?.companyId || !user.tourOperatorId) {
    await recordPartnerIpFailure(ip);
    throw new TRPCError({ code: "UNAUTHORIZED", message: GENERIC_FAILURE });
  }

  // Re-stated so the audit calls downstream see them as present, which the
  // check above has just established.
  return { ...user, companyId: user.companyId, tourOperatorId: user.tourOperatorId };
}

export const onboardingRouter = createTRPCRouter({
  /** Reads an invite link without spending it. */
  verifyInvite: publicProcedure
    .input(z.object({ token: inviteToken }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.partnerInvite.findUnique({
        where: { tokenHash: hashInviteToken(input.token) },
        select: {
          usedAt: true,
          expiresAt: true,
          user: { select: { email: true, name: true, twoFactorEnabled: true } },
          tourOperator: { select: { name: true } },
        },
      });

      if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        return { valid: false as const };
      }

      return {
        valid: true as const,
        email: invite.user.email,
        name: invite.user.name,
        partnerName: invite.tourOperator.name,
        alreadyEnrolled: invite.user.twoFactorEnabled,
      };
    }),

  /**
   * Spends the invite and sets the first password. Two-factor enrolment
   * follows on the same screen; the invite is consumed here so a leaked link
   * cannot be replayed after the password is known.
   */
  acceptInvite: publicProcedure
    .input(z.object({ token: inviteToken, password: partnerPassword }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = hashInviteToken(input.token);
      const invite = await ctx.db.partnerInvite.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          usedAt: true,
          expiresAt: true,
          companyId: true,
          tourOperatorId: true,
          userId: true,
          user: { select: { email: true } },
        },
      });

      if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invitation is no longer valid." });
      }

      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: invite.userId },
          data: {
            password: await hashPassword(input.password),
            mustSetPassword: false,
            failedLoginCount: 0,
            lockedUntil: null,
            // Any session minted before the password existed is now void.
            tokenVersion: { increment: 1 },
          },
        }),
        ctx.db.partnerInvite.update({
          where: { id: invite.id },
          data: { usedAt: new Date() },
        }),
      ]);

      await auditPartner("INVITE_ACCEPTED", {
        companyId: invite.companyId,
        tourOperatorId: invite.tourOperatorId,
        userId: invite.userId,
        ip: ctx.clientIp,
      });

      return { email: invite.user.email };
    }),

  /**
   * Issues a fresh authenticator secret. Not active until `confirmEnrolment`,
   * so an abandoned attempt cannot lock anyone out of their own account.
   */
  startEnrolment: publicProcedure
    .input(z.object({ email, password: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const user = await requirePartnerCredentials(ctx.db, ctx.clientIp, input);

      if (user.twoFactorEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor is already set up. Ask your travel company to reset it.",
        });
      }

      const totp = createTotp(user.email);
      await ctx.db.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: totp.secret.base32 },
      });

      const qr = qrcode(0, "M");
      qr.addData(totp.toString());
      qr.make();

      return { secret: totp.secret.base32, qrDataUrl: qr.createDataURL(5, 2) };
    }),

  /** Proves the authenticator is in sync, switches 2FA on, hands over the backup codes once. */
  confirmEnrolment: publicProcedure
    .input(
      z.object({
        email,
        password: z.string().min(1).max(128),
        code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requirePartnerCredentials(ctx.db, ctx.clientIp, input);

      if (user.twoFactorEnabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Two-factor is already set up." });
      }
      if (!user.twoFactorSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Start the setup again." });
      }
      if (!verifyTotp(user.email, user.twoFactorSecret, input.code)) {
        await recordPartnerIpFailure(ctx.clientIp);
        throw new TRPCError({ code: "BAD_REQUEST", message: "That code is not right. Try the next one." });
      }

      const backupCodes = generateBackupCodes();
      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorBackupCodes: backupCodes.map(hashBackupCode),
        },
      });

      await auditPartner("TWO_FACTOR_ENROLLED", {
        companyId: user.companyId,
        tourOperatorId: user.tourOperatorId,
        userId: user.id,
        ip: ctx.clientIp,
      });

      // Shown exactly once — only the hashes are kept.
      return { backupCodes };
    }),

  /** The terms a signed-in partner has not accepted yet. */
  currentTerms: partnerProcedure.query(async ({ ctx }) => {
    const [terms, user] = await Promise.all([
      ctx.db.partnerTermsVersion.findFirst({
        where: { companyId: ctx.partner.companyId },
        orderBy: { publishedAt: "desc" },
        select: { version: true, body: true, publishedAt: true },
      }),
      ctx.db.user.findUnique({
        where: { id: ctx.partner.userId },
        select: { termsVersion: true },
      }),
    ]);

    return { terms, acceptedVersion: user?.termsVersion ?? null };
  }),

  acceptTerms: partnerProcedure
    .input(z.object({ version: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const terms = await ctx.db.partnerTermsVersion.findUnique({
        where: { companyId_version: { companyId: ctx.partner.companyId, version: input.version } },
        select: { version: true },
      });
      if (!terms) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown terms version" });

      await ctx.db.user.update({
        where: { id: ctx.partner.userId },
        data: { termsVersion: terms.version, termsAcceptedAt: new Date() },
      });

      await auditPartner("TERMS_ACCEPTED", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: ctx.partner.userId,
        ip: ctx.clientIp,
        metadata: { version: terms.version },
      });

      return { version: terms.version };
    }),
});
