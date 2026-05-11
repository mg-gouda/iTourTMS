import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  opsMealRateCreateSchema,
  opsMealRateUpdateSchema,
  opsMealSeasonCreateSchema,
  opsMealSeasonUpdateSchema,
} from "@/lib/validations/tour-ops";

const tourOpsProcedure = moduleProcedure("tour-ops");

export const opsMealsRouter = createTRPCRouter({
  list: tourOpsProcedure
    .input(z.object({ mealType: z.string().optional(), destinationCode: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsMealRate.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.mealType ? { mealType: input.mealType as never } : {}),
          ...(input.destinationCode ? { destinationCode: input.destinationCode } : {}),
        },
        include: {
          supplier: { select: { id: true, name: true } },
          seasons: { orderBy: { dateFrom: "desc" } },
        },
        orderBy: [{ mealType: "asc" }, { nameEn: "asc" }],
      });
    }),

  getById: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rate = await ctx.db.opsMealRate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          supplier: { select: { id: true, name: true } },
          seasons: { orderBy: { dateFrom: "desc" } },
        },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND" });
      return rate;
    }),

  create: tourOpsProcedure
    .input(opsMealRateCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.opsMealRate.create({
        data: {
          ...input,
          supplierId: input.supplierId || null,
          destinationCode: input.destinationCode || null,
          companyId: ctx.companyId,
        },
        include: { supplier: { select: { id: true, name: true } } },
      });
    }),

  update: tourOpsProcedure
    .input(z.object({ id: z.string(), data: opsMealRateUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const rate = await ctx.db.opsMealRate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsMealRate.update({
        where: { id: input.id },
        data: {
          ...input.data,
          supplierId: input.data.supplierId !== undefined ? (input.data.supplierId || null) : undefined,
          destinationCode: input.data.destinationCode !== undefined ? (input.data.destinationCode || null) : undefined,
        },
        include: { supplier: { select: { id: true, name: true } } },
      });
    }),

  delete: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rate = await ctx.db.opsMealRate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsMealRate.delete({ where: { id: input.id } });
    }),

  addSeason: tourOpsProcedure
    .input(opsMealSeasonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const rate = await ctx.db.opsMealRate.findFirst({
        where: { id: input.mealRateId, companyId: ctx.companyId },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsMealRateSeason.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
        },
      });
    }),

  updateSeason: tourOpsProcedure
    .input(z.object({ id: z.string(), data: opsMealSeasonUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.opsMealRateSeason.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!season) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsMealRateSeason.update({
        where: { id: input.id },
        data: {
          ...input.data,
          dateFrom: input.data.dateFrom ? new Date(input.data.dateFrom) : undefined,
          dateTo: input.data.dateTo ? new Date(input.data.dateTo) : undefined,
        },
      });
    }),

  deleteSeason: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.opsMealRateSeason.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!season) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsMealRateSeason.delete({ where: { id: input.id } });
    }),

  getActiveRate: tourOpsProcedure
    .input(z.object({ mealRateId: z.string(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ? new Date(input.date) : new Date();
      return ctx.db.opsMealRateSeason.findFirst({
        where: {
          mealRateId: input.mealRateId,
          companyId: ctx.companyId,
          isActive: true,
          dateFrom: { lte: date },
          dateTo: { gte: date },
        },
        orderBy: { dateFrom: "desc" },
      });
    }),
});
