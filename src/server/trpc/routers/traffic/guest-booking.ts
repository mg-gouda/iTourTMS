import { z } from "zod";

import { guestBookingCreateSchema, guestBookingUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";

const proc = moduleProcedure("traffic");

export const guestBookingRouter = createTRPCRouter({
  list: proc
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.ttGuestBooking.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.status ? { status: input.status as never } : {}),
        },
        include: {
          vehicleType: { select: { id: true, name: true, code: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          _count: { select: { payments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttGuestBooking.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          vehicleType: { select: { id: true, name: true, code: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          payments: { orderBy: { paidAt: "desc" } },
        },
      });
    }),

  create: proc
    .input(guestBookingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const code = await generateSequenceNumber(ctx.db, ctx.companyId, "guest_booking");
      return ctx.db.ttGuestBooking.create({
        data: { ...input, code, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: guestBookingUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttGuestBooking.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  getQuote: proc
    .input(z.object({
      vehicleTypeId: z.string(),
      serviceType: z.string(),
      fromZoneId: z.string().optional(),
      toZoneId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const priceItem = await ctx.db.ttPriceItem.findFirst({
        where: {
          companyId: ctx.companyId,
          vehicleTypeId: input.vehicleTypeId,
          isActive: true,
          ...(input.fromZoneId ? { fromZoneId: input.fromZoneId } : {}),
          ...(input.toZoneId ? { toZoneId: input.toZoneId } : {}),
          ...(input.serviceType ? { serviceType: input.serviceType as never } : {}),
        },
        include: {
          currency: { select: { id: true, code: true, symbol: true } },
        },
      });
      return priceItem;
    }),

  confirmPayment: proc
    .input(z.object({
      bookingId: z.string(),
      amount: z.number().min(0),
      method: z.string(),
      reference: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.ttGuestBooking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });

      const payment = await ctx.db.ttGuestPayment.create({
        data: {
          guestBookingId: input.bookingId,
          amount: input.amount,
          method: input.method,
          reference: input.reference,
        },
      });

      const newPaidAmount = Number(booking.paidAmount) + input.amount;
      await ctx.db.ttGuestBooking.update({
        where: { id: input.bookingId },
        data: {
          paidAmount: newPaidAmount,
          status: newPaidAmount >= Number(booking.quotedPrice) ? "CONFIRMED" : "PENDING",
        },
      });

      return payment;
    }),
});

