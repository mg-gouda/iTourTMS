import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import qrcode from "qrcode-generator";
import { z } from "zod";

import { createTotp, generateBackupCodes, hashBackupCode, verifyTotp } from "@/lib/totp";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { hashPassword } from "@/lib/password";

const totpToken = z.object({ token: z.string().regex(/^\d{6}$/) });

export const userRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { companyId: ctx.user.companyId, isActive: true },
      select: { id: true, name: true, email: true, image: true },
      orderBy: { name: "asc" },
    });
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        locale: true,
        density: true,
        createdAt: true,
        twoFactorEnabled: true,
      },
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        image: z.string().nullish(),
        locale: z.string().min(2).max(10).optional(),
        density: z.enum(["comfortable", "compact"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.user.id },
        data: input,
      });
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { password: true },
      });

      if (!user.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password set for this account",
        });
      }

      const isValid = await bcrypt.compare(input.currentPassword, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      const hashedPassword = await hashPassword(input.newPassword);
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { password: hashedPassword },
      });

      return { success: true };
    }),

  // -------------------------------------------------------------------------
  // Two-factor authentication (TOTP)
  // -------------------------------------------------------------------------

  /** Generates a fresh secret + QR code. Not active until `twoFactorEnable`. */
  twoFactorSetup: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { email: true, twoFactorEnabled: true },
    });

    if (user.twoFactorEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Two-factor authentication is already enabled",
      });
    }

    const totp = createTotp(user.email);
    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { twoFactorSecret: totp.secret.base32 },
    });

    const qr = qrcode(0, "M");
    qr.addData(totp.toString());
    qr.make();

    return {
      secret: totp.secret.base32,
      qrDataUrl: qr.createDataURL(5, 2),
    };
  }),

  /** Confirms the authenticator is in sync, then turns 2FA on. */
  twoFactorEnable: protectedProcedure.input(totpToken).mutation(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { email: true, twoFactorSecret: true },
    });

    if (!user.twoFactorSecret) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Start setup first" });
    }

    if (!verifyTotp(user.email, user.twoFactorSecret, input.token)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code" });
    }

    // Recovery codes are shown once here — only their hashes are kept.
    const backupCodes = generateBackupCodes();
    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes.map(hashBackupCode),
      },
    });

    return { success: true, backupCodes };
  }),

  /** Turns 2FA off — requires a valid current code. */
  twoFactorDisable: protectedProcedure.input(totpToken).mutation(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { email: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Two-factor is not enabled" });
    }

    if (!verifyTotp(user.email, user.twoFactorSecret, input.token)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code" });
    }

    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });

    return { success: true };
  }),
});
