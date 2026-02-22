import { z } from "zod";

import { paymentTermSchema } from "@/lib/validations/finance";
import { computePaymentTermDueDates } from "@/server/services/finance/payment-term-calculator";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const paymentTermRouter = createTRPCRouter({
  list: financeProcedure.query(async ({ ctx }) => {
    return ctx.db.paymentTerm.findMany({
      where: { companyId: ctx.companyId },
      include: {
        lines: { orderBy: { sequence: "asc" } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.paymentTerm.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          lines: { orderBy: { sequence: "asc" } },
        },
      });
    }),

  create: financeProcedure
    .input(paymentTermSchema)
    .mutation(async ({ ctx, input }) => {
      const { lines, ...data } = input;

      return ctx.db.paymentTerm.create({
        data: {
          ...data,
          companyId: ctx.companyId,
          lines: {
            create: lines.map((line) => ({
              valueType: line.valueType,
              valueAmount: line.valueAmount,
              nbDays: line.nbDays,
              delayType: line.delayType,
              sequence: line.sequence,
            })),
          },
        },
        include: { lines: true },
      });
    }),

  update: financeProcedure
    .input(z.object({ id: z.string() }).merge(paymentTermSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, lines, ...data } = input;

      if (lines) {
        await ctx.db.paymentTermLine.deleteMany({ where: { paymentTermId: id } });
        await ctx.db.paymentTermLine.createMany({
          data: lines.map((line) => ({
            paymentTermId: id,
            valueType: line.valueType,
            valueAmount: line.valueAmount,
            nbDays: line.nbDays,
            delayType: line.delayType,
            sequence: line.sequence,
          })),
        });
      }

      return ctx.db.paymentTerm.update({
        where: { id },
        data,
        include: { lines: { orderBy: { sequence: "asc" } } },
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.paymentTerm.delete({ where: { id: input.id } });
    }),

  computeDueDates: financeProcedure
    .input(
      z.object({
        paymentTermId: z.string(),
        totalAmount: z.number(),
        invoiceDate: z.string(), // ISO date string
      }),
    )
    .query(async ({ ctx, input }) => {
      const term = await ctx.db.paymentTerm.findFirstOrThrow({
        where: { id: input.paymentTermId, companyId: ctx.companyId },
        include: { lines: { orderBy: { sequence: "asc" } } },
      });

      const installments = computePaymentTermDueDates(
        input.totalAmount,
        new Date(input.invoiceDate),
        term.lines.map((l) => ({
          valueType: l.valueType,
          valueAmount: Number(l.valueAmount),
          nbDays: l.nbDays,
          delayType: l.delayType,
          sequence: l.sequence,
        })),
      );

      return installments.map((i) => ({
        dueDate: i.dueDate.toISOString(),
        amount: i.amount.toNumber(),
        label: i.label,
      }));
    }),
});
