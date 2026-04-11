import { z } from "zod";

import { bookingPaymentCreateSchema } from "@/lib/validations/reservations";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  updateBookingPaymentStatus,
  createFinanceRecords,
} from "@/server/services/reservations/finance-bridge";
import { logBookingAction } from "@/server/services/reservations/timeline-logger";

const proc = moduleProcedure("reservations");
const finProc = moduleProcedure("finance");

export const bookingPaymentRouter = createTRPCRouter({
  // Finance team: list all payments across bookings with filters
  listAll: finProc
    .input(
      z.object({
        status: z.enum(["ALL", "UNPAID", "PARTIAL", "PAID"]).default("ALL"),
        source: z.enum(["ALL", "WEBSITE", "DIRECT", "B2B", "TOUR_OPERATOR"]).default("ALL"),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { companyId: ctx.companyId };

      if (input.status !== "ALL") {
        where.paymentStatus = input.status;
      }
      if (input.source !== "ALL") {
        where.source = input.source;
      }
      if (input.dateFrom) {
        where.checkIn = { ...(where.checkIn ?? {}), gte: new Date(input.dateFrom) };
      }
      if (input.dateTo) {
        where.checkOut = { ...(where.checkOut ?? {}), lte: new Date(input.dateTo) };
      }
      if (input.search) {
        where.OR = [
          { code: { contains: input.search, mode: "insensitive" } },
          { leadGuestName: { contains: input.search, mode: "insensitive" } },
          { hotel: { name: { contains: input.search, mode: "insensitive" } } },
        ];
      }

      return ctx.db.booking.findMany({
        where,
        select: {
          id: true,
          code: true,
          status: true,
          source: true,
          checkIn: true,
          checkOut: true,
          nights: true,
          leadGuestName: true,
          buyingTotal: true,
          sellingTotal: true,
          paymentStatus: true,
          totalPaid: true,
          balanceDue: true,
          hotel: { select: { id: true, name: true, code: true } },
          tourOperator: { select: { id: true, name: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              reference: true,
              paidAt: true,
              isRefund: true,
              notes: true,
              createdBy: { select: { name: true } },
            },
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }),

  listByBooking: proc
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify booking belongs to company
      await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
        select: { id: true },
      });

      return ctx.db.bookingPayment.findMany({
        where: { bookingId: input.bookingId },
        include: {
          currency: { select: { id: true, code: true, symbol: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { paidAt: "desc" },
      });
    }),

  create: proc
    .input(bookingPaymentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
        select: {
          id: true,
          status: true,
          tourOperatorId: true,
          tourOperator: { select: { id: true, name: true } },
        },
      });

      if (booking.status === "CANCELLED") {
        throw new Error("Cannot record payment for a cancelled booking");
      }

      const payment = await ctx.db.bookingPayment.create({
        data: {
          bookingId: input.bookingId,
          amount: input.amount,
          currencyId: input.currencyId,
          method: input.method,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          paidAt: new Date(input.paidAt),
          isRefund: input.isRefund,
          createdById: ctx.session.user.id,
        },
      });

      // Optionally create finance records
      if (input.createFinanceRecords && input.journalId) {
        await createFinanceRecords(
          ctx.db,
          ctx.companyId,
          {
            ...payment,
            paidAt: new Date(input.paidAt),
          },
          input.journalId,
          null, // partnerId — could be linked to TO's partner record
          ctx.session.user.id,
        );
      }

      // Update booking payment status
      await updateBookingPaymentStatus(ctx.db, input.bookingId);

      // Log to timeline
      const actionLabel = input.isRefund ? "REFUND" : "PAYMENT_RECEIVED";
      await logBookingAction(
        ctx.db,
        input.bookingId,
        actionLabel,
        `${input.isRefund ? "Refund" : "Payment"} of ${input.amount} via ${input.method}`,
        ctx.session.user.id,
      );

      return payment;
    }),

  delete: proc
    .input(z.object({ id: z.string(), bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.bookingPayment.findFirstOrThrow({
        where: { id: input.id, bookingId: input.bookingId },
        include: { booking: { select: { companyId: true } } },
      });

      if (payment.booking.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      if (payment.finPaymentId || payment.finMoveId) {
        throw new Error("Cannot delete payment linked to finance records");
      }

      const deleted = await ctx.db.bookingPayment.delete({
        where: { id: input.id },
      });

      await updateBookingPaymentStatus(ctx.db, input.bookingId);

      await logBookingAction(
        ctx.db,
        input.bookingId,
        "PAYMENT_REMOVED",
        `Payment of ${payment.amount} removed`,
        ctx.session.user.id,
      );

      return deleted;
    }),
});
