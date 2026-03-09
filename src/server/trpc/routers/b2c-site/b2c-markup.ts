import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import {
  b2cMarkupRuleCreateSchema,
  b2cMarkupRuleUpdateSchema,
} from "@/lib/validations/b2c-site";

export const b2cMarkupRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.b2cMarkupRule.findMany({
      where: { companyId },
      include: {
        tiers: { orderBy: { sortOrder: "asc" } },
        destination: { select: { id: true, name: true } },
        hotel: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.b2cMarkupRule.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          tiers: { orderBy: { sortOrder: "asc" } },
          destination: { select: { id: true, name: true } },
          hotel: { select: { id: true, name: true, code: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(b2cMarkupRuleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { tiers, ...ruleData } = input;

      return ctx.db.b2cMarkupRule.create({
        data: {
          companyId,
          ...ruleData,
          destinationId: ruleData.destinationId || null,
          hotelId: ruleData.hotelId || null,
          tiers: {
            create: tiers.map((t, i) => ({
              dateFrom: new Date(t.dateFrom),
              dateTo: new Date(t.dateTo),
              markupType: t.markupType,
              value: t.value,
              sortOrder: t.sortOrder ?? i,
            })),
          },
        },
        include: { tiers: true },
      });
    }),

  update: protectedProcedure
    .input(b2cMarkupRuleUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, tiers, ...ruleData } = input;

      return ctx.db.$transaction(async (tx) => {
        // Update rule fields
        await tx.b2cMarkupRule.update({
          where: { id },
          data: {
            ...ruleData,
            destinationId: ruleData.destinationId ?? undefined,
            hotelId: ruleData.hotelId ?? undefined,
          },
        });

        // Replace tiers if provided
        if (tiers) {
          await tx.b2cMarkupTier.deleteMany({ where: { ruleId: id } });
          if (tiers.length > 0) {
            await tx.b2cMarkupTier.createMany({
              data: tiers.map((t, i) => ({
                ruleId: id,
                dateFrom: new Date(t.dateFrom),
                dateTo: new Date(t.dateTo),
                markupType: t.markupType,
                value: t.value,
                sortOrder: t.sortOrder ?? i,
              })),
            });
          }
        }

        return tx.b2cMarkupRule.findUniqueOrThrow({
          where: { id },
          include: { tiers: { orderBy: { sortOrder: "asc" } } },
        });
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.b2cMarkupRule.delete({ where: { id: input.id } });
    }),
});
