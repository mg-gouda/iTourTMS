import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  opsGuidanceRateCreateSchema,
  opsGuidanceRateUpdateSchema,
  opsGuidanceSeasonCreateSchema,
  opsGuidanceSeasonUpdateSchema,
} from "@/lib/validations/tour-ops";

const tourOpsProcedure = moduleProcedure("tour-ops");

export const opsGuidanceRouter = createTRPCRouter({
  list: tourOpsProcedure
    .input(z.object({ destinationCode: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsGuidanceRate.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.destinationCode ? { destinationCode: input.destinationCode } : {}),
        },
        include: {
          seasons: { orderBy: { dateFrom: "desc" } },
        },
        orderBy: [{ destinationCode: "asc" }, { guideType: "asc" }],
      });
    }),

  getById: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rate = await ctx.db.opsGuidanceRate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: { seasons: { orderBy: { dateFrom: "desc" } } },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND" });
      return rate;
    }),

  create: tourOpsProcedure
    .input(opsGuidanceRateCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.opsGuidanceRate.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: tourOpsProcedure
    .input(z.object({ id: z.string(), data: opsGuidanceRateUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const rate = await ctx.db.opsGuidanceRate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsGuidanceRate.update({ where: { id: input.id }, data: input.data });
    }),

  delete: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rate = await ctx.db.opsGuidanceRate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsGuidanceRate.delete({ where: { id: input.id } });
    }),

  addSeason: tourOpsProcedure
    .input(opsGuidanceSeasonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const rate = await ctx.db.opsGuidanceRate.findFirst({
        where: { id: input.guidanceId, companyId: ctx.companyId },
      });
      if (!rate) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsGuidanceRateSeason.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
        },
      });
    }),

  updateSeason: tourOpsProcedure
    .input(z.object({ id: z.string(), data: opsGuidanceSeasonUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.opsGuidanceRateSeason.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!season) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsGuidanceRateSeason.update({
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
      const season = await ctx.db.opsGuidanceRateSeason.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!season) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsGuidanceRateSeason.delete({ where: { id: input.id } });
    }),

  getActiveRate: tourOpsProcedure
    .input(z.object({ guidanceId: z.string(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ? new Date(input.date) : new Date();
      return ctx.db.opsGuidanceRateSeason.findFirst({
        where: {
          guidanceId: input.guidanceId,
          companyId: ctx.companyId,
          isActive: true,
          dateFrom: { lte: date },
          dateTo: { gte: date },
        },
        orderBy: { dateFrom: "desc" },
      });
    }),
});
