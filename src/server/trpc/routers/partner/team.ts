import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PartnerRole } from "@prisma/client";
import qrcode from "qrcode-generator";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { hashPassword } from "@/lib/password";
import { createTotp, generateBackupCodes, hashBackupCode, verifyTotp } from "@/lib/totp";
import { createTRPCRouter, partnerProcedure, partnerRoleProcedure } from "@/server/trpc";
import { hashInviteToken } from "@/server/trpc/routers/b2b-portal/onboarding";
import { sendEmail } from "@/server/services/shared/email";

/**
 * A partner running their own colleagues, and each person running their own
 * login.
 *
 * Partner admins may invite, re-role and switch off their own people — but not
 * clear anyone's authenticator. A reset is how an account is stolen from
 * inside, so it stays with staff, and the backup codes issued at enrolment
 * cover the ordinary lost-phone case.
 */

const adminOnly = partnerRoleProcedure("PARTNER_ADMIN");
const INVITE_TTL_DAYS = 7;

const partnerPassword = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), {
    message: "Include an upper-case letter, a lower-case letter and a number",
  });

export const partnerTeamRouter = createTRPCRouter({
  list: adminOnly.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { tourOperatorId: ctx.partner.tourOperatorId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        partnerRole: true,
        twoFactorEnabled: true,
        mustSetPassword: true,
        lockedUntil: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  /**
   * Adds a colleague and emails them a one-time link. No password is set here:
   * an admin who chooses a colleague's password knows it, and then the audit
   * trail no longer says who did what.
   */
  invite: adminOnly
    .input(
      z.object({
        name: z.string().min(1).max(120),
        email: z.string().email().max(255),
        partnerRole: z.nativeEnum(PartnerRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();

      const existing = await ctx.db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, tourOperatorId: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That email address already has a login.",
        });
      }

      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email,
          password: null,
          mustSetPassword: true,
          partnerRole: input.partnerRole,
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
        },
        select: { id: true, email: true, name: true },
      });

      const token = randomBytes(32).toString("base64url");
      await ctx.db.partnerInvite.create({
        data: {
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          userId: user.id,
          tokenHash: hashInviteToken(token),
          expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
          createdById: ctx.partner.userId,
        },
      });

      const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/b2b/invite/${token}`;
      await sendEmail({
        to: user.email,
        subject: `Your ${ctx.partner.name} portal login`,
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1e1e1e;max-width:560px">
            <h2 style="font-size:17px;margin:0 0 14px">You have been given access to the booking portal</h2>
            <p style="font-size:14px;line-height:1.5;margin:0 0 8px">
              ${user.name}, a colleague at ${ctx.partner.name} has set up a login for you.
            </p>
            <p style="font-size:14px;line-height:1.5;margin:0 0 14px">
              Open the link below to choose a password and set up two-factor authentication.
              It works once and expires in ${INVITE_TTL_DAYS} days.
            </p>
            <p style="margin:0 0 14px"><a href="${url}" style="font-size:14px">${url}</a></p>
            <p style="font-size:12px;color:#888;margin:18px 0 0">
              If you were not expecting this, ignore it — the link does nothing until it is used.
            </p>
          </div>`,
      }).catch(() => {
        // The link is still on screen for the admin to pass on by hand.
      });

      await auditPartner("INVITE_SENT", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: user.id,
        ip: ctx.clientIp,
        metadata: { byPartnerUserId: ctx.partner.userId, role: input.partnerRole },
      });

      // Returned so an admin whose colleague never got the mail can pass it on.
      return { id: user.id, email: user.email, url, expiresInDays: INVITE_TTL_DAYS };
    }),

  setRole: adminOnly
    .input(z.object({ id: z.string(), partnerRole: z.nativeEnum(PartnerRole) }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.partner.userId) {
        // This is also what stops a partner losing every administrator: the
        // caller is always one, so somebody else demoting them is impossible.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role. Ask a colleague or your account manager.",
        });
      }
      const { count } = await ctx.db.user.updateMany({
        where: { id: input.id, tourOperatorId: ctx.partner.tourOperatorId },
        // The role rides in the session token, so the old one has to stop.
        data: { partnerRole: input.partnerRole, tokenVersion: { increment: 1 } },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });

      await auditPartner("USER_UPDATED", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: input.id,
        ip: ctx.clientIp,
        metadata: { role: input.partnerRole, byPartnerUserId: ctx.partner.userId },
      });

      return { id: input.id, partnerRole: input.partnerRole };
    }),

  setActive: adminOnly
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.partner.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot switch off your own login." });
      }
      const { count } = await ctx.db.user.updateMany({
        where: { id: input.id, tourOperatorId: ctx.partner.tourOperatorId },
        data: { isActive: input.isActive, tokenVersion: { increment: 1 } },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });

      await auditPartner(input.isActive ? "USER_UPDATED" : "USER_DEACTIVATED", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: input.id,
        ip: ctx.clientIp,
        metadata: { byPartnerUserId: ctx.partner.userId },
      });

      return { id: input.id, isActive: input.isActive };
    }),

  // ── The signed-in person's own account ───────────────────────────────────

  me: partnerProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.partner.userId },
      select: {
        id: true,
        name: true,
        email: true,
        partnerRole: true,
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
        termsVersion: true,
        termsAcceptedAt: true,
      },
    });

    return {
      ...user,
      // The codes themselves are hashed and gone; the count is what tells
      // somebody they are running low.
      backupCodesLeft: user.twoFactorBackupCodes.length,
      twoFactorBackupCodes: undefined,
      partnerName: ctx.partner.name,
    };
  }),

  updateProfile: partnerProcedure
    .input(z.object({ name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.partner.userId },
        data: { name: input.name },
      });
      return { name: input.name };
    }),

  changePassword: partnerProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1).max(128),
        newPassword: partnerPassword,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.partner.userId },
        select: { password: true },
      });
      if (!user.password || !(await bcrypt.compare(input.currentPassword, user.password))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Your current password is not right." });
      }

      await ctx.db.user.update({
        where: { id: ctx.partner.userId },
        data: { password: await hashPassword(input.newPassword) },
      });

      await auditPartner("PASSWORD_CHANGED", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: ctx.partner.userId,
        ip: ctx.clientIp,
      });

      return { success: true };
    }),

  /**
   * Fresh backup codes, for somebody who has used most of theirs. Needs a live
   * authenticator code: this replaces the way back in, so proving you still
   * hold the phone is the whole point.
   */
  regenerateBackupCodes: partnerProcedure
    .input(z.object({ token: z.string().regex(/^\d{6}$/) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.partner.userId },
        select: { email: true, twoFactorEnabled: true, twoFactorSecret: true },
      });
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Two-factor is not set up on this account." });
      }
      if (!verifyTotp(user.email, user.twoFactorSecret, input.token)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That code is not right." });
      }

      const backupCodes = generateBackupCodes();
      await ctx.db.user.update({
        where: { id: ctx.partner.userId },
        data: { twoFactorBackupCodes: backupCodes.map(hashBackupCode) },
      });

      await auditPartner("BACKUP_CODES_VIEWED", {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        userId: ctx.partner.userId,
        ip: ctx.clientIp,
        metadata: { regenerated: true },
      });

      // Shown once. The old ones stopped working the moment these were written.
      return { backupCodes };
    }),

  /** The authenticator QR again, for somebody re-adding it to a new phone. */
  twoFactorQr: partnerProcedure
    .input(z.object({ password: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.partner.userId },
        select: { email: true, password: true, twoFactorEnabled: true, twoFactorSecret: true },
      });

      // The session alone is not enough to re-display the secret: a borrowed
      // unlocked laptop would otherwise hand over the second factor.
      if (!user.password || !(await bcrypt.compare(input.password, user.password))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Your password is not right." });
      }
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Two-factor is not set up on this account." });
      }

      const totp = createTotp(user.email, user.twoFactorSecret);
      const qr = qrcode(0, "M");
      qr.addData(totp.toString());
      qr.make();

      return { qrDataUrl: qr.createDataURL(5, 2), secret: user.twoFactorSecret };
    }),
});
