import { z } from "zod";

import { createTRPCRouter, partnerProcedure } from "@/server/trpc";

/**
 * The partner's own account: what they have spent, what is left, and the
 * movements behind those two numbers. Everything is scoped by the session —
 * there is no partner id to pass in, so there is none to tamper with.
 */
export const partnerCreditRouter = createTRPCRouter({
  summary: partnerProcedure.query(async ({ ctx }) => {
    const [partner, currency] = await Promise.all([
      ctx.db.tourOperator.findUniqueOrThrow({
        where: { id: ctx.partner.tourOperatorId },
        select: {
          name: true,
          creditLimit: true,
          creditUsed: true,
          paymentTermDays: true,
        },
      }),
      ctx.db.company.findUnique({
        where: { id: ctx.partner.companyId },
        select: { baseCurrency: { select: { code: true } } },
      }),
    ]);

    // A zero limit means "no limit set", the same reading the booking engine
    // takes — showing it as "nothing available" would be wrong and alarming.
    const limit = Number(partner.creditLimit ?? 0);
    const used = Number(partner.creditUsed ?? 0);

    return {
      partnerName: partner.name,
      currencyCode: currency?.baseCurrency?.code ?? "",
      creditLimit: limit > 0 ? limit : null,
      creditUsed: used,
      available: limit > 0 ? Math.max(limit - used, 0) : null,
      paymentTermDays: partner.paymentTermDays ?? null,
    };
  }),

  transactions: partnerProcedure
    .input(
      z
        .object({
          from: z.date().optional(),
          to: z.date().optional(),
          take: z.number().int().min(1).max(200).default(100),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.b2bCreditTransaction.findMany({
        where: {
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          ...(input?.from || input?.to
            ? {
                createdAt: {
                  ...(input.from && { gte: input.from }),
                  ...(input.to && { lte: input.to }),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input?.take ?? 100,
        select: {
          id: true,
          type: true,
          amount: true,
          runningBalance: true,
          reference: true,
          notes: true,
          createdAt: true,
          booking: { select: { id: true, code: true } },
        },
      });
    }),

  /** Opening balance, the period's movements, closing balance. */
  statement: partnerProcedure
    .input(z.object({ from: z.date(), to: z.date() }))
    .query(async ({ ctx, input }) => {
      const scope = {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
      };

      const [opening, transactions] = await Promise.all([
        ctx.db.b2bCreditTransaction.aggregate({
          where: { ...scope, createdAt: { lt: input.from } },
          _sum: { amount: true },
        }),
        ctx.db.b2bCreditTransaction.findMany({
          where: { ...scope, createdAt: { gte: input.from, lte: input.to } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            amount: true,
            runningBalance: true,
            reference: true,
            notes: true,
            createdAt: true,
            booking: { select: { code: true } },
          },
        }),
      ]);

      const openingBalance = Number(opening._sum.amount ?? 0);
      const movement = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

      return {
        from: input.from,
        to: input.to,
        openingBalance,
        transactions,
        closingBalance: openingBalance + movement,
      };
    }),
});
