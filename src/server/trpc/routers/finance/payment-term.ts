import { z } from "zod";

import { paymentTermSchema } from "@/lib/validations/finance";
import { computePaymentTermDueDates } from "@/server/services/finance/payment-term-calculator";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

export const paymentTermRouter = createTRPCRouter({
  list: p("finance:paymentTerm:read").query(async ({ ctx }) => {
    return ctx.db.paymentTerm.findMany({
      where: { companyId: ctx.companyId },
      include: {
        lines: { orderBy: { sequence: "asc" } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: p("finance:paymentTerm:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.paymentTerm.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          lines: { orderBy: { sequence: "asc" } },
        },
      });
    }),

  create: p("finance:paymentTerm:create")
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

  update: p("finance:paymentTerm:update")
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

  delete: p("finance:paymentTerm:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.paymentTerm.delete({ where: { id: input.id } });
    }),

  computeDueDates: p("finance:paymentTerm:read")
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
