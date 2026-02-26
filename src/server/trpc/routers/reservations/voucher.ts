import { z } from "zod";

import { voucherCreateSchema, voucherStatusSchema } from "@/lib/validations/reservations";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";
import { logBookingAction } from "@/server/services/reservations/timeline-logger";

const proc = moduleProcedure("reservations");

export const voucherRouter = createTRPCRouter({
  list: proc
    .input(
      z
        .object({
          status: z.enum(["ISSUED", "USED", "CANCELLED"]).optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { companyId: ctx.companyId };
      if (input?.status) where.status = input.status;
      if (input?.search) {
        where.OR = [
          { code: { contains: input.search, mode: "insensitive" } },
          { booking: { code: { contains: input.search, mode: "insensitive" } } },
        ];
      }

      return ctx.db.voucher.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              code: true,
              leadGuestName: true,
              checkIn: true,
              checkOut: true,
              hotel: { select: { id: true, name: true } },
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.voucher.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          booking: {
            include: {
              hotel: { select: { id: true, name: true, code: true, address: true, phone: true, email: true } },
              rooms: {
                include: {
                  roomType: { select: { id: true, name: true, code: true } },
                  mealBasis: { select: { id: true, name: true, mealCode: true } },
                  guests: {
                    include: {
                      guest: { select: { id: true, firstName: true, lastName: true, passportNo: true, nationality: true } },
                    },
                  },
                },
              },
              currency: { select: { id: true, code: true, symbol: true } },
              tourOperator: { select: { id: true, name: true } },
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
      });
    }),

  create: proc
    .input(voucherCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
        select: { id: true, status: true },
      });

      if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
        throw new Error("Vouchers can only be issued for confirmed or checked-in bookings");
      }

      const code = await generateSequenceNumber(ctx.db, ctx.companyId, "voucher");

      const voucher = await ctx.db.voucher.create({
        data: {
          companyId: ctx.companyId,
          code,
          bookingId: input.bookingId,
          notes: input.notes ?? null,
          createdById: ctx.session.user.id,
        },
      });

      await logBookingAction(
        ctx.db,
        input.bookingId,
        "VOUCHER_ISSUED",
        `Voucher ${code} issued`,
        ctx.session.user.id,
      );

      return voucher;
    }),

  transition: proc
    .input(voucherStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const voucher = await ctx.db.voucher.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        select: { id: true, status: true, bookingId: true, code: true },
      });

      if (input.action === "use") {
        if (voucher.status !== "ISSUED") throw new Error("Only issued vouchers can be used");
        return ctx.db.voucher.update({
          where: { id: input.id },
          data: { status: "USED", usedAt: new Date() },
        });
      }

      if (input.action === "cancel") {
        if (voucher.status === "CANCELLED") throw new Error("Voucher already cancelled");
        return ctx.db.voucher.update({
          where: { id: input.id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
      }

      throw new Error("Invalid action");
    }),
});
