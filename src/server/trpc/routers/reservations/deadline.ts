import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("reservations");

export const deadlineRouter = createTRPCRouter({
  listByBooking: proc
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });
      return ctx.db.bookingDeadline.findMany({
        where: { bookingId: input.bookingId },
        include: {
          completedByUser: { select: { id: true, name: true } },
          waivedByUser: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      });
    }),

  dashboard: proc
    .input(
      z.object({
        status: z.enum(["UPCOMING", "WARNING", "OVERDUE"]).optional(),
        days: z.number().int().min(1).max(90).default(14),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const future = new Date(now.getTime() + (input?.days ?? 14) * 86_400_000);

      return ctx.db.bookingDeadline.findMany({
        where: {
          booking: { companyId: ctx.companyId },
          status: input?.status ?? { in: ["UPCOMING", "WARNING", "OVERDUE"] },
          dueDate: { lte: future },
        },
        include: {
          booking: {
            select: {
              id: true,
              code: true,
              leadGuestName: true,
              hotel: { select: { name: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 200,
      });
    }),

  create: proc
    .input(
      z.object({
        bookingId: z.string(),
        type: z.enum([
          "OPTION_EXPIRY", "DEPOSIT_DUE", "BALANCE_DUE", "ROOMING_LIST",
          "FREE_CANCELLATION", "NAME_CHANGE", "RECONFIRMATION",
          "SUPPLIER_PAYMENT", "ALLOTMENT_RELEASE",
        ]),
        dueDate: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });
      return ctx.db.bookingDeadline.create({
        data: {
          bookingId: input.bookingId,
          type: input.type,
          dueDate: new Date(input.dueDate),
          description: input.description ?? null,
        },
      });
    }),

  complete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dl = await ctx.db.bookingDeadline.findFirstOrThrow({
        where: { id: input.id },
        include: { booking: { select: { companyId: true } } },
      });
      if (dl.booking.companyId !== ctx.companyId) throw new Error("Not found");

      return ctx.db.bookingDeadline.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: ctx.session.user.id,
        },
      });
    }),

  waive: proc
    .input(z.object({ id: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const dl = await ctx.db.bookingDeadline.findFirstOrThrow({
        where: { id: input.id },
        include: { booking: { select: { companyId: true } } },
      });
      if (dl.booking.companyId !== ctx.companyId) throw new Error("Not found");

      return ctx.db.bookingDeadline.update({
        where: { id: input.id },
        data: {
          status: "WAIVED",
          waivedAt: new Date(),
          waivedBy: ctx.session.user.id,
          waiverNote: input.note ?? null,
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dl = await ctx.db.bookingDeadline.findFirstOrThrow({
        where: { id: input.id },
        include: { booking: { select: { companyId: true } } },
      });
      if (dl.booking.companyId !== ctx.companyId) throw new Error("Not found");

      return ctx.db.bookingDeadline.delete({ where: { id: input.id } });
    }),
});
