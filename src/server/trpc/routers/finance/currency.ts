import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { currencyRateUpsertSchema } from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const currencyRouter = createTRPCRouter({
  // ── Company base currency ──

  getBaseCurrency: financeProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: ctx.companyId },
      select: { baseCurrency: { select: { id: true, code: true, symbol: true } } },
    });
    return company?.baseCurrency ?? null;
  }),

  // ── Currency read procedures ──

  list: financeProcedure
    .input(z.object({ activeOnly: z.boolean().default(true) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.currency.findMany({
        where: input?.activeOnly !== false ? { isActive: true } : {},
        select: { id: true, code: true, name: true, symbol: true, decimals: true, isActive: true },
        orderBy: { code: "asc" },
      });
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const currency = await ctx.db.currency.findUnique({
        where: { id: input.id },
        select: { id: true, code: true, name: true, symbol: true, decimals: true, isActive: true },
      });
      if (!currency) throw new TRPCError({ code: "NOT_FOUND", message: "Currency not found" });
      return currency;
    }),

  // ── Rate procedures (company-scoped) ──

  listRates: financeProcedure
    .input(z.object({
      currencyId: z.string(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor, currencyId, dateFrom, dateTo } = input;
      const where: any = { companyId: ctx.companyId, currencyId };
      if (dateFrom || dateTo) {
        where.date = {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        };
      }

      const items = await ctx.db.currencyRate.findMany({
        where,
        include: { currency: { select: { code: true, symbol: true } } },
        orderBy: { date: "desc" },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getRate: financeProcedure
    .input(z.object({ currencyId: z.string(), date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.currencyRate.findFirst({
        where: {
          companyId: ctx.companyId,
          currencyId: input.currencyId,
          date: { lte: input.date },
        },
        orderBy: { date: "desc" },
        include: { currency: { select: { code: true, symbol: true } } },
      });
    }),

  upsertRate: financeProcedure
    .input(currencyRateUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.currencyRate.upsert({
        where: {
          currencyId_companyId_date: {
            currencyId: input.currencyId,
            companyId: ctx.companyId,
            date: input.date,
          },
        },
        create: {
          currencyId: input.currencyId,
          companyId: ctx.companyId,
          date: input.date,
          rate: input.rate,
          source: "manual",
        },
        update: { rate: input.rate, source: "manual" },
      });
    }),

  importRates: financeProcedure
    .input(z.object({
      currencyId: z.string().min(1),
      rates: z.array(z.object({
        date: z.coerce.date(),
        rate: z.number().positive(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(
        input.rates.map((r) =>
          ctx.db.currencyRate.upsert({
            where: {
              currencyId_companyId_date: {
                currencyId: input.currencyId,
                companyId: ctx.companyId,
                date: r.date,
              },
            },
            create: {
              currencyId: input.currencyId,
              companyId: ctx.companyId,
              date: r.date,
              rate: r.rate,
              source: "import",
            },
            update: { rate: r.rate, source: "import" },
          }),
        ),
      );
    }),

  deleteRate: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rate = await ctx.db.currencyRate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND", message: "Rate not found" });
      return ctx.db.currencyRate.delete({ where: { id: input.id } });
    }),

  // ── Toggle currency active/inactive ──

  toggleActive: financeProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.currency.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),
});
