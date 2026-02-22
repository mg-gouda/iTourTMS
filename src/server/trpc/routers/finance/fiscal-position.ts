import { z } from "zod";

import { fiscalPositionSchema } from "@/lib/validations/finance";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const fiscalPositionRouter = createTRPCRouter({
  list: financeProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { companyId: ctx.companyId };
      if (input?.isActive !== undefined) where.isActive = input.isActive;

      return ctx.db.fiscalPosition.findMany({
        where: where as any,
        include: {
          country: { select: { id: true, name: true } },
          _count: { select: { taxMaps: true, accountMaps: true } },
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: financeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.fiscalPosition.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          country: { select: { id: true, name: true } },
          taxMaps: {
            include: {
              taxSrc: { select: { id: true, name: true, amount: true } },
              taxDest: { select: { id: true, name: true, amount: true } },
            },
          },
          accountMaps: {
            include: {
              accountSrc: { select: { id: true, code: true, name: true } },
              accountDest: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });
    }),

  create: financeProcedure
    .input(fiscalPositionSchema)
    .mutation(async ({ ctx, input }) => {
      const { taxMaps, accountMaps, ...data } = input;

      return ctx.db.fiscalPosition.create({
        data: {
          ...data,
          companyId: ctx.companyId,
          taxMaps: {
            create: taxMaps.map((m) => ({
              taxSrcId: m.taxSrcId,
              taxDestId: m.taxDestId,
            })),
          },
          accountMaps: {
            create: accountMaps.map((m) => ({
              accountSrcId: m.accountSrcId,
              accountDestId: m.accountDestId,
            })),
          },
        },
        include: { taxMaps: true, accountMaps: true },
      });
    }),

  update: financeProcedure
    .input(z.object({ id: z.string() }).merge(fiscalPositionSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, taxMaps, accountMaps, ...data } = input;

      // Delete-recreate maps if provided
      if (taxMaps) {
        await ctx.db.fiscalPositionTaxMap.deleteMany({
          where: { fiscalPositionId: id },
        });
        await ctx.db.fiscalPositionTaxMap.createMany({
          data: taxMaps.map((m) => ({
            fiscalPositionId: id,
            taxSrcId: m.taxSrcId,
            taxDestId: m.taxDestId,
          })),
        });
      }

      if (accountMaps) {
        await ctx.db.fiscalPositionAccountMap.deleteMany({
          where: { fiscalPositionId: id },
        });
        await ctx.db.fiscalPositionAccountMap.createMany({
          data: accountMaps.map((m) => ({
            fiscalPositionId: id,
            accountSrcId: m.accountSrcId,
            accountDestId: m.accountDestId,
          })),
        });
      }

      return ctx.db.fiscalPosition.update({
        where: { id },
        data,
        include: {
          taxMaps: {
            include: {
              taxSrc: { select: { id: true, name: true } },
              taxDest: { select: { id: true, name: true } },
            },
          },
          accountMaps: {
            include: {
              accountSrc: { select: { id: true, code: true, name: true } },
              accountDest: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });
    }),

  delete: financeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.fiscalPosition.delete({ where: { id: input.id } });
    }),
});
