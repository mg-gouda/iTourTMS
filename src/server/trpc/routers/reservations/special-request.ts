import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("reservations");

export const specialRequestRouter = createTRPCRouter({
  listByBooking: proc
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });
      return ctx.db.bookingSpecialRequest.findMany({
        where: { bookingId: input.bookingId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: proc
    .input(
      z.object({
        bookingId: z.string(),
        category: z.enum([
          "BED_CONFIG", "FLOOR", "VIEW", "DIETARY",
          "ACCESSIBILITY", "CELEBRATION", "OTHER",
        ]),
        request: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });
      return ctx.db.bookingSpecialRequest.create({
        data: {
          bookingId: input.bookingId,
          category: input.category,
          request: input.request,
        },
      });
    }),

  updateStatus: proc
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["REQUESTED", "CONFIRMED", "NOT_AVAILABLE", "CANCELLED"]),
        response: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.bookingSpecialRequest.findFirstOrThrow({
        where: { id: input.id },
        include: { booking: { select: { companyId: true } } },
      });
      if (req.booking.companyId !== ctx.companyId) throw new Error("Not found");

      return ctx.db.bookingSpecialRequest.update({
        where: { id: input.id },
        data: {
          status: input.status,
          response: input.response ?? null,
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.bookingSpecialRequest.findFirstOrThrow({
        where: { id: input.id },
        include: { booking: { select: { companyId: true } } },
      });
      if (req.booking.companyId !== ctx.companyId) throw new Error("Not found");

      return ctx.db.bookingSpecialRequest.delete({ where: { id: input.id } });
    }),
});
