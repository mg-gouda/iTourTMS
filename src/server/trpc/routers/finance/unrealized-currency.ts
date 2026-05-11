import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const unrealizedCurrencyRouter = createTRPCRouter({
  list: financeProcedure.query(async ({ ctx }) => {
    return ctx.db.unrealizedCurrencyEntry.findMany({
      where: { companyId: ctx.session.user.companyId },
      include: { currency: { select: { id: true, code: true, name: true, symbol: true } } },
      orderBy: { date: "desc" },
    });
  }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rec = await ctx.db.unrealizedCurrencyEntry.findFirst({
        where: { id: input.id, companyId: ctx.session.user.companyId },
        include: { currency: true },
      });
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });
      return rec;
    }),

  create: financeProcedure
    .input(z.object({
      name: z.string().min(1),
      date: z.string(),
      currencyId: z.string(),
      gainLoss: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.unrealizedCurrencyEntry.create({
        data: {
          ...input,
          companyId: ctx.session.user.companyId,
          date: new Date(input.date),
          gainLoss: new Decimal(input.gainLoss),
        },
      });
    }),

  reverse: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rec = await ctx.db.unrealizedCurrencyEntry.findFirst({
        where: { id: input.id, companyId: ctx.session.user.companyId },
      });
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });
      if (rec.isReversed) throw new TRPCError({ code: "BAD_REQUEST", message: "Already reversed" });
      return ctx.db.unrealizedCurrencyEntry.update({
        where: { id: input.id },
        data: { isReversed: true },
      });
    }),

  // Compute open FX positions for company
  computePositions: financeProcedure.query(async ({ ctx }) => {
    const lines = await ctx.db.moveLineItem.findMany({
      where: {
        move: { companyId: ctx.session.user.companyId, state: "POSTED" },
        currencyId: { not: null },
        balance: { not: 0 },
      },
      include: {
        move: { select: { date: true, name: true } },
        account: { select: { code: true, name: true, accountType: true } },
        currency: { select: { code: true, symbol: true } },
      },
      take: 200,
    });
    return lines;
  }),
});
