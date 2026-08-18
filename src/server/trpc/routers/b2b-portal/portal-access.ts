import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { hashInviteToken } from "@/server/trpc/routers/b2b-portal/onboarding";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

/** Days an invitation link stays usable. Long enough to survive a weekend. */
const INVITE_TTL_DAYS = 7;

/** Confirms the partner belongs to the caller's tenant before anything else. */
async function requireOperator(
  db: Prisma.TransactionClient | typeof import("@/server/db").db,
  companyId: string,
  tourOperatorId: string,
) {
  const operator = await db.tourOperator.findFirst({
    where: { id: tourOperatorId, companyId },
    select: { id: true, name: true, portalEnabled: true },
  });
  if (!operator) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });
  return operator;
}

export const portalAccessRouter = createTRPCRouter({
  /** Everything that decides whether and how a partner may use the portal. */
  getSettings: p("b2b-portal:contract:read")
    .input(z.object({ tourOperatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operator = await ctx.db.tourOperator.findFirst({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
        select: {
          id: true,
          name: true,
          portalEnabled: true,
          bookingValueCap: true,
          accountManagerId: true,
          accountManager: { select: { id: true, name: true, email: true } },
          hotelAssignments: {
            select: { hotelId: true, hotel: { select: { name: true, code: true } } },
          },
        },
      });
      if (!operator) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });
      return operator;
    }),

  updateSettings: p("b2b-portal:contract:update")
    .input(
      z.object({
        tourOperatorId: z.string(),
        portalEnabled: z.boolean().optional(),
        // null clears the cap: no ceiling, every booking confirms straight away.
        bookingValueCap: z.number().min(0).nullable().optional(),
        accountManagerId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operator = await requireOperator(ctx.db, ctx.companyId, input.tourOperatorId);

      // An account manager must be staff in this tenant, or partner mail would
      // reply to someone who cannot answer it.
      if (input.accountManagerId) {
        const manager = await ctx.db.user.findFirst({
          where: { id: input.accountManagerId, companyId: ctx.companyId, tourOperatorId: null },
          select: { id: true },
        });
        if (!manager) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown account manager" });
      }

      const updated = await ctx.db.tourOperator.update({
        where: { id: operator.id },
        data: {
          ...(input.portalEnabled !== undefined && { portalEnabled: input.portalEnabled }),
          ...(input.bookingValueCap !== undefined && { bookingValueCap: input.bookingValueCap }),
          ...(input.accountManagerId !== undefined && { accountManagerId: input.accountManagerId }),
        },
        select: { id: true, portalEnabled: true, bookingValueCap: true, accountManagerId: true },
      });

      if (input.portalEnabled !== undefined && input.portalEnabled !== operator.portalEnabled) {
        await auditPartner(input.portalEnabled ? "PORTAL_ENABLED" : "PORTAL_DISABLED", {
          companyId: ctx.companyId,
          tourOperatorId: operator.id,
          userId: ctx.user.id,
          ip: ctx.clientIp,
        });
      }

      return updated;
    }),

  /**
   * The hotels a partner may see and book. Replaces the whole list: an
   * allowlist edited by diff drifts, and drift here means a partner keeps
   * access to a hotel that was removed from their deal.
   */
  setHotelAllowlist: p("b2b-portal:contract:update")
    .input(z.object({ tourOperatorId: z.string(), hotelIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await requireOperator(ctx.db, ctx.companyId, input.tourOperatorId);

      // Only hotels of this tenant, so a foreign id cannot be smuggled in.
      const hotels = await ctx.db.hotel.findMany({
        where: { id: { in: input.hotelIds }, companyId: ctx.companyId },
        select: { id: true },
      });

      await ctx.db.$transaction([
        ctx.db.hotelTourOperator.deleteMany({ where: { tourOperatorId: input.tourOperatorId } }),
        ctx.db.hotelTourOperator.createMany({
          data: hotels.map((h) => ({ hotelId: h.id, tourOperatorId: input.tourOperatorId })),
          skipDuplicates: true,
        }),
      ]);

      return { count: hotels.length };
    }),

  /** Hotels to choose from when editing an allowlist, under the b2b permission. */
  listHotels: p("b2b-portal:contract:read").query(async ({ ctx }) => {
    return ctx.db.hotel.findMany({
      where: { companyId: ctx.companyId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),

  /** Staff who can be named as an account manager. */
  listAccountManagers: p("b2b-portal:contract:read").query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { companyId: ctx.companyId, tourOperatorId: null, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }),

  /** Every partner with the settings that decide their portal access. */
  listPartners: p("b2b-portal:contract:read").query(async ({ ctx }) => {
    return ctx.db.tourOperator.findMany({
      where: { companyId: ctx.companyId },
      select: {
        id: true,
        name: true,
        code: true,
        active: true,
        partnerType: true,
        portalEnabled: true,
        bookingValueCap: true,
        accountManagerId: true,
        accountManager: { select: { id: true, name: true, email: true } },
        _count: { select: { hotelAssignments: true, partnerUsers: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  /** One-time invitation link. The token is shown once; only its hash is kept. */
  createInvite: p("b2b-portal:partnerUser:manage")
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.userId, companyId: ctx.companyId, tourOperatorId: { not: null } },
        select: { id: true, email: true, tourOperatorId: true },
      });
      if (!user?.tourOperatorId) throw new TRPCError({ code: "NOT_FOUND", message: "Partner user not found" });

      const token = randomBytes(32).toString("base64url");

      await ctx.db.$transaction([
        // Any earlier link is dead the moment a new one is issued.
        ctx.db.partnerInvite.deleteMany({ where: { userId: user.id, usedAt: null } }),
        ctx.db.partnerInvite.create({
          data: {
            companyId: ctx.companyId,
            tourOperatorId: user.tourOperatorId,
            userId: user.id,
            tokenHash: hashInviteToken(token),
            expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
            createdById: ctx.user.id,
          },
        }),
      ]);

      await auditPartner("INVITE_SENT", {
        companyId: ctx.companyId,
        tourOperatorId: user.tourOperatorId,
        userId: user.id,
        ip: ctx.clientIp,
      });

      const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
      return {
        email: user.email,
        url: `${base}/b2b/invite/${token}`,
        expiresInDays: INVITE_TTL_DAYS,
      };
    }),

  /** What a partner and their people have been doing. */
  listAudit: p("b2b-portal:contract:read")
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        action: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        take: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.PartnerAuditEventWhereInput = { companyId: ctx.companyId };
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.action) where.action = input.action;
      if (input.from || input.to) {
        where.createdAt = { ...(input.from && { gte: input.from }), ...(input.to && { lte: input.to }) };
      }

      return ctx.db.partnerAuditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.take,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          ip: true,
          metadata: true,
          createdAt: true,
          tourOperator: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  // ── Terms of use ─────────────────────────────────────────────────────────

  listTerms: p("b2b-portal:contract:read").query(async ({ ctx }) => {
    return ctx.db.partnerTermsVersion.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { publishedAt: "desc" },
      select: { id: true, version: true, publishedAt: true, body: true },
    });
  }),

  /**
   * Publishing a version makes every partner accept it again on their next
   * page load — the portal layout compares it against what each user signed.
   */
  publishTerms: p("b2b-portal:contract:update")
    .input(z.object({ version: z.string().min(1).max(50), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.partnerTermsVersion.findUnique({
        where: { companyId_version: { companyId: ctx.companyId, version: input.version } },
        select: { id: true },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "That version already exists" });

      return ctx.db.partnerTermsVersion.create({
        data: {
          companyId: ctx.companyId,
          version: input.version,
          body: input.body,
          createdById: ctx.user.id,
        },
        select: { id: true, version: true, publishedAt: true },
      });
    }),
});
