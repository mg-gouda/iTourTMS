import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  opsSightseeingEntryCreateSchema,
  opsSightseeingEntryUpdateSchema,
  opsSightseeingSeasonCreateSchema,
  opsSightseeingSeasonUpdateSchema,
} from "@/lib/validations/tour-ops";

const p = (code: string) => modulePermissionProcedure("tour-ops", code);

export const opsSightseeingRouter = createTRPCRouter({
  list: p("tour-ops:component:read")
    .input(z.object({ destinationCode: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsSightseeingEntry.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.destinationCode ? { destinationCode: input.destinationCode } : {}),
        },
        include: {
          seasons: {
            orderBy: { dateFrom: "desc" },
          },
        },
        orderBy: [{ destinationCode: "asc" }, { sortOrder: "asc" }],
      });
    }),

  getById: p("tour-ops:component:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.opsSightseeingEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          seasons: {
            orderBy: { dateFrom: "desc" },
          },
        },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return entry;
    }),

  create: p("tour-ops:component:create")
    .input(opsSightseeingEntryCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.opsSightseeingEntry.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("tour-ops:component:update")
    .input(z.object({ id: z.string(), data: opsSightseeingEntryUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.opsSightseeingEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsSightseeingEntry.update({ where: { id: input.id }, data: input.data });
    }),

  delete: p("tour-ops:component:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.opsSightseeingEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsSightseeingEntry.delete({ where: { id: input.id } });
    }),

  addSeason: p("tour-ops:component:create")
    .input(opsSightseeingSeasonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.opsSightseeingEntry.findFirst({
        where: { id: input.entryId, companyId: ctx.companyId },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsSightseeingRateSeason.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
        },
      });
    }),

  updateSeason: p("tour-ops:component:update")
    .input(z.object({ id: z.string(), data: opsSightseeingSeasonUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.opsSightseeingRateSeason.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!season) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsSightseeingRateSeason.update({
        where: { id: input.id },
        data: {
          ...input.data,
          dateFrom: input.data.dateFrom ? new Date(input.data.dateFrom) : undefined,
          dateTo: input.data.dateTo ? new Date(input.data.dateTo) : undefined,
        },
      });
    }),

  deleteSeason: p("tour-ops:component:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.opsSightseeingRateSeason.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!season) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsSightseeingRateSeason.delete({ where: { id: input.id } });
    }),

  bulkImport: p("tour-ops:component:update")
    .input(z.array(z.object({
      destinationCode: z.string(),
      nameEn: z.string(),
      nameAr: z.string().optional(),
      seasonName: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      isActive: z.boolean().optional(),
      priceEGP: z.number().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      let created = 0;
      let updated = 0;

      for (const row of input) {
        if (!row.destinationCode || !row.nameEn) continue;

        // Upsert entry
        let entry = await ctx.db.opsSightseeingEntry.findFirst({
          where: { companyId: ctx.companyId, destinationCode: row.destinationCode, nameEn: row.nameEn },
        });
        if (!entry) {
          entry = await ctx.db.opsSightseeingEntry.create({
            data: { companyId: ctx.companyId, destinationCode: row.destinationCode, nameEn: row.nameEn, nameAr: row.nameAr || null },
          });
          created++;
        }

        if (!row.seasonName || !row.dateFrom || !row.dateTo) continue;

        const existing = await ctx.db.opsSightseeingRateSeason.findFirst({
          where: { companyId: ctx.companyId, entryId: entry.id, name: row.seasonName },
        });
        if (!existing) {
          await ctx.db.opsSightseeingRateSeason.create({
            data: {
              companyId: ctx.companyId,
              entryId: entry.id,
              name: row.seasonName,
              dateFrom: new Date(row.dateFrom),
              dateTo: new Date(row.dateTo),
              isActive: row.isActive ?? true,
              priceEGP: row.priceEGP ?? 0,
            },
          });
        } else {
          await ctx.db.opsSightseeingRateSeason.update({
            where: { id: existing.id },
            data: { dateFrom: new Date(row.dateFrom), dateTo: new Date(row.dateTo), isActive: row.isActive ?? existing.isActive, priceEGP: row.priceEGP ?? existing.priceEGP },
          });
          updated++;
        }
      }

      return { created, updated };
    }),

  getActivePrice: p("tour-ops:component:read")
    .input(z.object({ entryId: z.string(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ? new Date(input.date) : new Date();
      return ctx.db.opsSightseeingRateSeason.findFirst({
        where: {
          entryId: input.entryId,
          companyId: ctx.companyId,
          isActive: true,
          dateFrom: { lte: date },
          dateTo: { gte: date },
        },
        orderBy: { dateFrom: "desc" },
      });
    }),
});
