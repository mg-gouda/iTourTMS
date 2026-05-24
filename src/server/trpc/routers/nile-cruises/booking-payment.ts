import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseBookingPaymentCreateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseBookingPaymentRouter = createTRPCRouter({
  listByBooking: p("nile-cruises:booking:read")
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingPayment.findMany({
        where: { bookingId: input.bookingId },
        orderBy: { paidAt: "desc" },
      });
    }),

  record: p("nile-cruises:booking:update")
    .input(cruiseBookingPaymentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.cruiseBookingPayment.create({
        data: {
          ...input,
          paidAt: new Date(input.paidAt as string),
          recordedById: ctx.session.user.id,
        },
      });
      // Update booking paidAmount and balanceDue
      const allPayments = await ctx.db.cruiseBookingPayment.aggregate({
        where: { bookingId: input.bookingId },
        _sum: { amount: true },
      });
      const paidAmount = Number(allPayments._sum.amount ?? 0);
      const booking = await ctx.db.cruiseBooking.findFirstOrThrow({
        where: { id: input.bookingId },
        select: { grossTotal: true },
      });
      await ctx.db.cruiseBooking.update({
        where: { id: input.bookingId },
        data: {
          paidAmount,
          balanceDue: Math.max(0, Number(booking.grossTotal) - paidAmount),
        },
      });
      return payment;
    }),

  delete: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.cruiseBookingPayment.delete({ where: { id: input.id } });
      const allPayments = await ctx.db.cruiseBookingPayment.aggregate({
        where: { bookingId: payment.bookingId },
        _sum: { amount: true },
      });
      const paidAmount = Number(allPayments._sum.amount ?? 0);
      const booking = await ctx.db.cruiseBooking.findFirstOrThrow({
        where: { id: payment.bookingId },
        select: { grossTotal: true },
      });
      await ctx.db.cruiseBooking.update({
        where: { id: payment.bookingId },
        data: { paidAmount, balanceDue: Math.max(0, Number(booking.grossTotal) - paidAmount) },
      });
      return payment;
    }),
});
