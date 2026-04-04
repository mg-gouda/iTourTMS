import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("reservations");

export const communicationRouter = createTRPCRouter({
  listByBooking: proc
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });
      return ctx.db.bookingCommunication.findMany({
        where: { bookingId: input.bookingId },
        include: {
          sentBy: { select: { id: true, name: true } },
        },
        orderBy: { sentAt: "desc" },
      });
    }),

  create: proc
    .input(
      z.object({
        bookingId: z.string(),
        direction: z.enum(["OUTBOUND", "INBOUND"]),
        channel: z.enum(["EMAIL", "PHONE", "FAX", "API", "PORTAL"]),
        type: z.enum([
          "AVAILABILITY_REQUEST", "CONFIRMATION", "AMENDMENT",
          "VOUCHER", "PAYMENT_REMINDER", "CANCELLATION",
          "ROOMING_LIST", "GENERAL",
        ]),
        subject: z.string().optional(),
        body: z.string().optional(),
        recipient: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });
      return ctx.db.bookingCommunication.create({
        data: {
          bookingId: input.bookingId,
          direction: input.direction,
          channel: input.channel,
          type: input.type,
          subject: input.subject ?? null,
          body: input.body ?? null,
          recipient: input.recipient ?? null,
          sentById: ctx.session.user.id,
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comm = await ctx.db.bookingCommunication.findFirstOrThrow({
        where: { id: input.id },
        include: { booking: { select: { companyId: true } } },
      });
      if (comm.booking.companyId !== ctx.companyId) throw new Error("Not found");

      return ctx.db.bookingCommunication.delete({ where: { id: input.id } });
    }),
});
