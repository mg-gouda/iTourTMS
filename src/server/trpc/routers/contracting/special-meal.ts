import { z } from "zod";

import {
  specialMealCreateSchema,
  specialMealUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const specialMealRouter = createTRPCRouter({
  // ── List by contract ──
  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractSpecialMeal.findMany({
        where: { contractId: input.contractId },
        orderBy: { dateFrom: "asc" },
      });
    }),

  // ── Get by ID ──
  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const meal = await ctx.db.contractSpecialMeal.findFirstOrThrow({
        where: { id: input.id },
        include: {
          contract: { select: { companyId: true } },
        },
      });
      if (meal.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return meal;
    }),

  // ── Create ──
  create: proc
    .input(specialMealCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractSpecialMeal.create({
        data: {
          contractId: input.contractId,
          occasion: input.occasion,
          customName: input.customName ?? null,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
          mandatory: input.mandatory,
          adultPrice: input.adultPrice,
          childPrice: input.childPrice ?? null,
          teenPrice: input.teenPrice ?? null,
          infantPrice: input.infantPrice ?? null,
          excludedMealBases: input.excludedMealBases ?? null,
          notes: input.notes ?? null,
        },
      });
    }),

  // ── Update ──
  update: proc
    .input(z.object({ id: z.string(), data: specialMealUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.contractSpecialMeal.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (existing.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      const data: Record<string, unknown> = { ...input.data };
      if (input.data.dateFrom) data.dateFrom = new Date(input.data.dateFrom);
      if (input.data.dateTo) data.dateTo = new Date(input.data.dateTo);

      return ctx.db.contractSpecialMeal.update({
        where: { id: input.id },
        data,
      });
    }),

  // ── Delete ──
  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.contractSpecialMeal.findFirstOrThrow({
        where: { id: input.id },
        include: { contract: { select: { companyId: true } } },
      });
      if (existing.contract.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }

      return ctx.db.contractSpecialMeal.delete({
        where: { id: input.id },
      });
    }),
});
