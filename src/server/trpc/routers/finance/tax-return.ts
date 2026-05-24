import { TRPCError } from "@trpc/server";
import Decimal from "decimal.js";
import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

export const taxReturnRouter = createTRPCRouter({
  list: p("finance:tax:read")
    .input(z.object({ state: z.enum(["DRAFT", "CONFIRMED", "FILED"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.taxReturn.findMany({
        where: { companyId: ctx.companyId, ...(input.state ? { state: input.state } : {}) },
        include: { period: { select: { id: true, name: true, code: true } } },
        orderBy: { dateFrom: "desc" },
      });
    }),

  getById: p("finance:tax:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ret = await ctx.db.taxReturn.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          period: { select: { id: true, name: true } },
          lines: { include: { tax: { select: { id: true, name: true, amount: true } } } },
        },
      });
      if (!ret) throw new TRPCError({ code: "NOT_FOUND" });
      return ret;
    }),

  create: p("finance:tax:create")
    .input(z.object({
      name: z.string().min(1),
      periodId: z.string().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.taxReturn.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
        },
      });
    }),

  compute: p("finance:tax:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ret = await ctx.db.taxReturn.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!ret) throw new TRPCError({ code: "NOT_FOUND" });

      // Aggregate tax lines from posted moves in the period
      const moveLines = await ctx.db.moveLineItem.findMany({
        where: {
          move: {
            companyId: ctx.companyId,
            state: "POSTED",
            date: { gte: ret.dateFrom, lte: ret.dateTo },
          },
          taxLine: { isNot: null },
        },
        include: { taxLine: { select: { id: true, name: true } } },
      });

      // Group by tax
      const byTax = new Map<string, { taxId: string; taxName: string; base: Decimal; amount: Decimal }>();
      for (const line of moveLines) {
        if (!line.taxLineId || !line.taxLine) continue;
        const key = line.taxLineId;
        if (!byTax.has(key)) byTax.set(key, { taxId: key, taxName: line.taxLine.name, base: new Decimal(0), amount: new Decimal(0) });
        const entry = byTax.get(key)!;
        entry.amount = entry.amount.plus(new Decimal(line.credit.toString()).minus(new Decimal(line.debit.toString())).abs());
      }

      const lines = Array.from(byTax.values());
      const totalTax = lines.reduce((s, l) => s.plus(l.amount), new Decimal(0));

      await ctx.db.taxReturnLine.deleteMany({ where: { taxReturnId: input.id } });
      if (lines.length > 0) {
        await ctx.db.taxReturnLine.createMany({
          data: lines.map((l) => ({
            taxReturnId: input.id,
            taxId: l.taxId,
            taxName: l.taxName,
            taxBase: l.base,
            taxAmount: l.amount,
          })),
        });
      }

      return ctx.db.taxReturn.update({
        where: { id: input.id },
        data: { totalTax, totalDue: totalTax },
      });
    }),

  confirm: p("finance:tax:confirm")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.taxReturn.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { state: "CONFIRMED" },
      });
    }),

  file: p("finance:tax:confirm")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.taxReturn.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { state: "FILED", filedAt: new Date(), filedBy: ctx.session.user.name ?? ctx.session.user.email ?? undefined },
      });
    }),

  delete: p("finance:tax:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ret = await ctx.db.taxReturn.findFirst({ where: { id: input.id, companyId: ctx.companyId } });
      if (!ret) throw new TRPCError({ code: "NOT_FOUND" });
      if (ret.state !== "DRAFT") throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT returns can be deleted" });
      return ctx.db.taxReturn.delete({ where: { id: input.id } });
    }),
});
