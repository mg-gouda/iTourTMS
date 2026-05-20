import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("b2b-portal", code);

export const creditRouter = createTRPCRouter({
  summary: p("b2b-portal:credit:read")
    .input(z.object({ tourOperatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const to = await ctx.db.tourOperator.findFirst({
        where: { id: input.tourOperatorId, companyId: ctx.companyId },
        select: { id: true, name: true, creditLimit: true, creditUsed: true },
      });
      if (!to)
        throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });

      const recentTx = await ctx.db.b2bCreditTransaction.findMany({
        where: { tourOperatorId: input.tourOperatorId, companyId: ctx.companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          booking: { select: { id: true, code: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      const creditLimit = Number(to.creditLimit);
      const creditUsed = Number(to.creditUsed);
      return {
        tourOperatorId: to.id,
        tourOperatorName: to.name,
        creditLimit,
        creditUsed,
        available: creditLimit - creditUsed,
        recentTransactions: recentTx,
      };
    }),

  listTransactions: p("b2b-portal:credit:read")
    .input(
      z.object({
        tourOperatorId: z.string(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        type: z.enum(["BOOKING_CHARGE", "PAYMENT_RECEIVED", "CREDIT_NOTE", "ADJUSTMENT"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.B2bCreditTransactionWhereInput = {
        companyId: ctx.companyId,
        tourOperatorId: input.tourOperatorId,
      };
      if (input.type) where.type = input.type;
      if (input.dateFrom || input.dateTo) {
        where.createdAt = {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {}),
        };
      }

      const [items, total] = await Promise.all([
        ctx.db.b2bCreditTransaction.findMany({
          where,
          include: {
            booking: { select: { id: true, code: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.b2bCreditTransaction.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  recordPayment: p("b2b-portal:credit:manage")
    .input(
      z.object({
        tourOperatorId: z.string(),
        amount: z.number().positive(),
        reference: z.string().optional(),
        bookingId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      return ctx.db.$transaction(async (tx) => {
        const to = await tx.tourOperator.findFirst({
          where: { id: input.tourOperatorId, companyId: ctx.companyId },
        });
        if (!to)
          throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });

        const newCreditUsed = Number(to.creditUsed) - input.amount;
        await tx.tourOperator.update({
          where: { id: input.tourOperatorId },
          data: { creditUsed: newCreditUsed },
        });

        return tx.b2bCreditTransaction.create({
          data: {
            companyId: ctx.companyId,
            tourOperatorId: input.tourOperatorId,
            type: "PAYMENT_RECEIVED",
            amount: input.amount,
            runningBalance: newCreditUsed,
            reference: input.reference,
            bookingId: input.bookingId,
            notes: input.notes,
            createdById: userId,
          },
        });
      });
    }),

  adjustment: p("b2b-portal:credit:manage")
    .input(
      z.object({
        tourOperatorId: z.string(),
        amount: z.number(), // positive = credit, negative = debit
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      return ctx.db.$transaction(async (tx) => {
        const to = await tx.tourOperator.findFirst({
          where: { id: input.tourOperatorId, companyId: ctx.companyId },
        });
        if (!to)
          throw new TRPCError({ code: "NOT_FOUND", message: "Tour operator not found" });

        const newCreditUsed = Number(to.creditUsed) - input.amount;
        await tx.tourOperator.update({
          where: { id: input.tourOperatorId },
          data: { creditUsed: newCreditUsed },
        });

        return tx.b2bCreditTransaction.create({
          data: {
            companyId: ctx.companyId,
            tourOperatorId: input.tourOperatorId,
            type: "ADJUSTMENT",
            amount: input.amount,
            runningBalance: newCreditUsed,
            reference: input.reference,
            notes: input.notes,
            createdById: userId,
          },
        });
      });
    }),
});
