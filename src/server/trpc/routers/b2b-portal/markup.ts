import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("b2b-portal");

export const markupRouter = createTRPCRouter({
  list: proc
    .input(
      z
        .object({
          tourOperatorId: z.string().optional(),
          active: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.MarkupRuleWhereInput = { companyId: ctx.companyId };
      if (input?.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input?.active !== undefined) where.active = input.active;

      return ctx.db.markupRule.findMany({
        where,
        include: {
          contract: { select: { id: true, code: true, name: true } },
          hotel: { select: { id: true, name: true } },
          destination: { select: { id: true, name: true } },
          market: { select: { id: true, name: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ priority: "desc" }, { name: "asc" }],
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rule = await ctx.db.markupRule.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contract: { select: { id: true, code: true, name: true } },
          hotel: { select: { id: true, name: true } },
          destination: { select: { id: true, name: true } },
          market: { select: { id: true, name: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          tariffs: true,
        },
      });
      if (!rule)
        throw new TRPCError({ code: "NOT_FOUND", message: "Markup rule not found" });
      return rule;
    }),

  create: proc
    .input(
      z.object({
        name: z.string().min(1),
        markupType: z.enum(["PERCENTAGE", "FIXED_PER_NIGHT", "FIXED_PER_BOOKING"]),
        value: z.number(),
        contractId: z.string().optional(),
        hotelId: z.string().optional(),
        destinationId: z.string().optional(),
        marketId: z.string().optional(),
        tourOperatorId: z.string().optional(),
        priority: z.number().int().default(0),
        active: z.boolean().default(true),
        validFrom: z.date().optional(),
        validTo: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.markupRule.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          markupType: z.enum(["PERCENTAGE", "FIXED_PER_NIGHT", "FIXED_PER_BOOKING"]).optional(),
          value: z.number().optional(),
          contractId: z.string().optional(),
          hotelId: z.string().optional(),
          destinationId: z.string().optional(),
          marketId: z.string().optional(),
          tourOperatorId: z.string().optional(),
          priority: z.number().int().optional(),
          active: z.boolean().optional(),
          validFrom: z.date().optional(),
          validTo: z.date().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.markupRule.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Markup rule not found" });
      return ctx.db.markupRule.update({ where: { id: input.id }, data: input.data });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.markupRule.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Markup rule not found" });
      return ctx.db.markupRule.delete({ where: { id: input.id } });
    }),
});
