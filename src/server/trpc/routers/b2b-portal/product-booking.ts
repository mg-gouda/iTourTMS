import { TRPCError } from "@trpc/server";
import { PartnerProductBookingStatus, PartnerProductType } from "@prisma/client";
import { z } from "zod";

import { auditPartner } from "@/lib/b2b/audit";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { notifyPartnerProductAnswer } from "@/server/services/b2b/partner-notifications";

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

/**
 * The queue of partner requests for excursions, transfers and packages.
 *
 * These do not confirm themselves the way a hotel stay does — somebody has to
 * check a guide is free or a vehicle exists — so this is where a human answers
 * them, and the partner is told either way.
 */
export const productBookingRouter = createTRPCRouter({
  list: p("b2b-portal:reservation:read")
    .input(
      z
        .object({
          status: z.nativeEnum(PartnerProductBookingStatus).optional(),
          productType: z.nativeEnum(PartnerProductType).optional(),
          tourOperatorId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.partnerProductBooking.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.status ? { status: input.status } : {}),
          ...(input?.productType ? { productType: input.productType } : {}),
          ...(input?.tourOperatorId ? { tourOperatorId: input.tourOperatorId } : {}),
        },
        orderBy: [{ status: "asc" }, { serviceDate: "asc" }],
        take: 200,
        select: {
          id: true,
          code: true,
          status: true,
          productType: true,
          productName: true,
          serviceDate: true,
          adults: true,
          children: true,
          units: true,
          staffPrice: true,
          net: true,
          markupAmount: true,
          currency: true,
          leadGuestName: true,
          partnerReference: true,
          notes: true,
          staffNote: true,
          createdAt: true,
          answeredAt: true,
          tourOperator: { select: { id: true, name: true, code: true } },
          requestedBy: { select: { name: true, email: true } },
          answeredBy: { select: { name: true } },
        },
      });
    }),

  /** Confirms or declines one request, and tells the partner which. */
  answer: p("b2b-portal:reservation:update")
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["CONFIRMED", "DECLINED", "CANCELLED"]),
        staffNote: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.partnerProductBooking.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        select: { id: true, code: true, status: true, tourOperatorId: true },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      // An answered request stays answered; changing it after the partner has
      // been told is a new conversation, not an edit.
      if (booking.status !== "REQUESTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This request was already ${booking.status.toLowerCase()}.`,
        });
      }

      const updated = await ctx.db.partnerProductBooking.update({
        where: { id: booking.id },
        data: {
          status: input.status,
          staffNote: input.staffNote ?? null,
          answeredById: ctx.user.id,
          answeredAt: new Date(),
        },
        select: {
          id: true,
          code: true,
          status: true,
          productName: true,
          serviceDate: true,
          net: true,
          currency: true,
          staffNote: true,
          tourOperatorId: true,
        },
      });

      void notifyPartnerProductAnswer(updated.tourOperatorId, {
        code: updated.code,
        productName: updated.productName,
        serviceDate: updated.serviceDate,
        status: updated.status,
        net: Number(updated.net),
        currency: updated.currency,
        staffNote: updated.staffNote,
      });

      await auditPartner(input.status === "CONFIRMED" ? "BOOKING_CREATED" : "BOOKING_CANCELLED", {
        companyId: ctx.companyId,
        tourOperatorId: booking.tourOperatorId,
        userId: ctx.user.id,
        entityType: "PartnerProductBooking",
        entityId: booking.id,
        ip: ctx.clientIp,
        metadata: { code: booking.code, status: input.status, byStaff: true },
      });

      return updated;
    }),
});
