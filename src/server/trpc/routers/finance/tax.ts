import { z } from "zod";

import { taxGroupSchema, taxSchema } from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const taxRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z.object({
        typeTaxUse: z.enum(["SALE", "PURCHASE", "NONE"]).optional(),
        isActive: z.boolean().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { companyId: ctx.companyId };
      if (input?.typeTaxUse) where.typeTaxUse = input.typeTaxUse;
      if (input?.isActive !== undefined) where.isActive = input.isActive;

      return ctx.db.tax.findMany({
        where: where as any,
        include: { taxGroup: true, repartitionLines: { include: { account: true } } },
        orderBy: { sequence: "asc" },
      });
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.tax.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          taxGroup: true,
          repartitionLines: {
            include: { account: true },
            orderBy: { sequence: "asc" },
          },
        },
      });
    }),

  create: financeProcedure
    .input(taxSchema)
    .mutation(async ({ ctx, input }) => {
      const { repartitionLines, ...data } = input;

      return ctx.db.tax.create({
        data: {
          ...data,
          amount: data.amount,
          companyId: ctx.companyId,
          repartitionLines: {
            create: repartitionLines.map((line) => ({
              factorPercent: line.factorPercent,
              accountId: line.accountId ?? undefined,
              useInTaxClosing: line.useInTaxClosing,
              documentType: line.documentType,
              sequence: line.sequence,
            })),
          },
        },
        include: { repartitionLines: true },
      });
    }),

  update: financeProcedure
    .input(z.object({ id: z.string() }).merge(taxSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, repartitionLines, ...data } = input;

      // If repartition lines are provided, replace them
      if (repartitionLines) {
        await ctx.db.taxRepartitionLine.deleteMany({ where: { taxId: id } });
        await ctx.db.taxRepartitionLine.createMany({
          data: repartitionLines.map((line) => ({
            taxId: id,
            factorPercent: line.factorPercent,
            accountId: line.accountId ?? undefined,
            useInTaxClosing: line.useInTaxClosing,
            documentType: line.documentType,
            sequence: line.sequence,
          })),
        });
      }

      return ctx.db.tax.update({
        where: { id },
        data,
        include: { repartitionLines: true, taxGroup: true },
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tax.delete({ where: { id: input.id } });
    }),

  // ── Tax Groups ──

  listGroups: financeProcedure.query(async ({ ctx }) => {
    return ctx.db.taxGroup.findMany({
      where: { companyId: ctx.companyId },
      include: { _count: { select: { taxes: true } } },
      orderBy: { sequence: "asc" },
    });
  }),

  createGroup: financeProcedure
    .input(taxGroupSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.taxGroup.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  updateGroup: financeProcedure
    .input(z.object({ id: z.string() }).merge(taxGroupSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.taxGroup.update({ where: { id }, data });
    }),

  deleteGroup: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.taxGroup.delete({ where: { id: input.id } });
    }),
});
