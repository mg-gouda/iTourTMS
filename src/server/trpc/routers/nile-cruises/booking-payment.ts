import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseBookingPaymentCreateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseBookingPaymentRouter = createTRPCRouter({
  listByBooking: p("nile-cruises:booking:read")
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingPayment.findMany({
        // CruiseBookingPayment has no companyId — scope through its booking
        where: { bookingId: input.bookingId, booking: { companyId: ctx.companyId } },
        orderBy: { paidAt: "desc" },
      });
    }),

  record: p("nile-cruises:booking:update")
    .input(cruiseBookingPaymentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.cruiseBooking.findFirst({
        where: { id: input.bookingId, companyId: ctx.companyId },
        select: { grossTotal: true },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
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
      const existing = await ctx.db.cruiseBookingPayment.findFirst({
        where: { id: input.id, booking: { companyId: ctx.companyId } },
        select: { id: true, bookingId: true, booking: { select: { grossTotal: true } } },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const payment = await ctx.db.cruiseBookingPayment.delete({ where: { id: existing.id } });
      const allPayments = await ctx.db.cruiseBookingPayment.aggregate({
        where: { bookingId: existing.bookingId },
        _sum: { amount: true },
      });
      const paidAmount = Number(allPayments._sum.amount ?? 0);
      await ctx.db.cruiseBooking.update({
        where: { id: existing.bookingId },
        data: { paidAmount, balanceDue: Math.max(0, Number(existing.booking.grossTotal) - paidAmount) },
      });
      return payment;
    }),
});
