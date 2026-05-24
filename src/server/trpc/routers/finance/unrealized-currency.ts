import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

export const unrealizedCurrencyRouter = createTRPCRouter({
  list: p("finance:move:read").query(async ({ ctx }) => {
    return ctx.db.unrealizedCurrencyEntry.findMany({
      where: { companyId: ctx.companyId },
      include: { currency: { select: { id: true, code: true, name: true, symbol: true } } },
      orderBy: { date: "desc" },
    });
  }),

  getById: p("finance:settings:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rec = await ctx.db.unrealizedCurrencyEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: { currency: true },
      });
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });
      return rec;
    }),

  create: p("finance:settings:create")
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
          companyId: ctx.companyId,
          date: new Date(input.date),
          gainLoss: new Decimal(input.gainLoss),
        },
      });
    }),

  reverse: p("finance:settings:cancel")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rec = await ctx.db.unrealizedCurrencyEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });
      if (rec.isReversed) throw new TRPCError({ code: "BAD_REQUEST", message: "Already reversed" });
      return ctx.db.unrealizedCurrencyEntry.update({
        where: { id: input.id },
        data: { isReversed: true },
      });
    }),

  // Compute open FX positions for company
  computePositions: p("finance:move:read").query(async ({ ctx }) => {
    const lines = await ctx.db.moveLineItem.findMany({
      where: {
        move: { companyId: ctx.companyId, state: "POSTED" },
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
