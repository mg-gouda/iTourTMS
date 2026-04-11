import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("b2b-portal");

export const reservationRouter = createTRPCRouter({
  list: proc
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        status: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = {
        companyId: ctx.companyId,
        source: "TOUR_OPERATOR",
      };
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.status) where.status = input.status as Prisma.EnumBookingStatusFilter["equals"];
      if (input.dateFrom || input.dateTo) {
        where.checkIn = {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {}),
        };
      }
      if (input.search) {
        where.OR = [
          { code: { contains: input.search, mode: "insensitive" } },
          { leadGuestName: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.db.booking.findMany({
          where,
          include: {
            hotel: { select: { id: true, name: true } },
            tourOperator: { select: { id: true, name: true, code: true } },
            currency: { select: { id: true, code: true, symbol: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.booking.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          hotel: { select: { id: true, name: true, code: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          currency: true,
          contract: { select: { id: true, code: true, name: true } },
          rooms: {
            include: {
              roomType: true,
              mealBasis: true,
              guests: { include: { guest: true } },
            },
          },
          guests: { include: { guest: true } },
          payments: { include: { currency: true, createdBy: true }, orderBy: { paidAt: "desc" } },
          timeline: { include: { user: true }, orderBy: { createdAt: "desc" } },
          vouchers: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
      if (!booking)
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      return booking;
    }),
});
