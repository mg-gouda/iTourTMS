import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("b2b-portal");

export const voucherRouter = createTRPCRouter({
  list: proc
    .input(
      z.object({
        tourOperatorId: z.string().optional(),
        status: z.enum(["ISSUED", "USED", "CANCELLED"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.VoucherWhereInput = {
        companyId: ctx.companyId,
        booking: {
          source: "TOUR_OPERATOR",
          ...(input.tourOperatorId ? { tourOperatorId: input.tourOperatorId } : {}),
        },
      };
      if (input.status) where.status = input.status;

      const [items, total] = await Promise.all([
        ctx.db.voucher.findMany({
          where,
          include: {
            booking: {
              include: {
                hotel: { select: { id: true, name: true } },
                tourOperator: { select: { id: true, name: true, code: true } },
              },
            },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.voucher.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  generate: proc
    .input(
      z.object({
        bookingId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const booking = await ctx.db.booking.findFirst({
        where: { id: input.bookingId, companyId: ctx.companyId },
      });
      if (!booking)
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      const code = await ctx.db.$transaction(async (tx) => {
        const seq = await tx.sequence.upsert({
          where: { companyId_code: { companyId: ctx.companyId, code: "voucher" } },
          update: { nextNumber: { increment: 1 } },
          create: {
            companyId: ctx.companyId,
            code: "voucher",
            prefix: "VC",
            separator: "-",
            padding: 5,
            nextNumber: 2,
          },
        });
        const num = seq.nextNumber - 1;
        return `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;
      });

      return ctx.db.voucher.create({
        data: {
          companyId: ctx.companyId,
          code,
          bookingId: input.bookingId,
          notes: input.notes,
          createdById: userId,
        },
        include: {
          booking: {
            include: {
              hotel: { select: { id: true, name: true } },
              tourOperator: { select: { id: true, name: true } },
            },
          },
        },
      });
    }),
});
