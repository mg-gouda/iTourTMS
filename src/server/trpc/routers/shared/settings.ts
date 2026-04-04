import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

export const settingsRouter = createTRPCRouter({
  getCompanySettings: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.user.companyId;
    if (!companyId) return null;

    return ctx.db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        legalName: true,
        taxId: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
        faviconUrl: true,
        loginLogoUrl: true,
        sidebarLogoUrl: true,
        loginBgUrl: true,
        innerBgUrl: true,
        reportsLogoUrl: true,
        timezone: true,
        googlePlacesApiKey: true,
        hotelCodePrefix: true,
        fiscalYearStart: true,
        fiscalYearEnd: true,
        country: { select: { id: true, name: true, code: true } },
        baseCurrency: { select: { id: true, code: true, name: true } },
      },
    });
  }),

  getGooglePlacesKey: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.user.companyId;
    if (!companyId) return null;

    const company = await ctx.db.company.findUnique({
      where: { id: companyId },
      select: { googlePlacesApiKey: true },
    });
    return company?.googlePlacesApiKey ?? null;
  }),

  updateCompanySettings: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        legalName: z.string().nullish(),
        taxId: z.string().nullish(),
        phone: z.string().nullish(),
        email: z.string().email().nullish(),
        website: z.string().nullish(),
        logoUrl: z.string().nullish(),
        faviconUrl: z.string().nullish(),
        loginLogoUrl: z.string().nullish(),
        sidebarLogoUrl: z.string().nullish(),
        loginBgUrl: z.string().nullish(),
        innerBgUrl: z.string().nullish(),
        reportsLogoUrl: z.string().nullish(),
        timezone: z.string().optional(),
        googlePlacesApiKey: z.string().nullish(),
        hotelCodePrefix: z.string().max(1).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company associated");

      return ctx.db.company.update({
        where: { id: companyId },
        data: input,
      });
    }),

  getLicenseStatus: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.user.companyId;
    if (!companyId) return null;

    const license = await ctx.db.license.findFirst({
      where: { companyId, isActivated: true },
      select: {
        keyPrefix: true,
        keySuffix: true,
        activatedAt: true,
        expiresAt: true,
        isRevoked: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!license || !license.expiresAt) return null;

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (license.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    );

    let status: "active" | "expiring_soon" | "expired" = "active";
    if (license.isRevoked || daysRemaining <= 0) {
      status = "expired";
    } else if (daysRemaining <= 30) {
      status = "expiring_soon";
    }

    return {
      keyPrefix: license.keyPrefix,
      keySuffix: license.keySuffix,
      activatedAt: license.activatedAt,
      expiresAt: license.expiresAt,
      daysRemaining,
      status,
    };
  }),
});
