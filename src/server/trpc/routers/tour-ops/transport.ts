import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import {
  opsTransportDestinationCreateSchema,
  opsTransportDestinationUpdateSchema,
  opsTransportRouteCreateSchema,
  opsTransportRouteUpdateSchema,
  opsTransportSeasonCreateSchema,
  opsTransportSeasonUpdateSchema,
} from "@/lib/validations/tour-ops";

const tourOpsProcedure = moduleProcedure("tour-ops");

export const opsTransportRouter = createTRPCRouter({
  // ── Destinations ──

  listDestinations: tourOpsProcedure.query(async ({ ctx }) => {
    return ctx.db.opsTransportDestination.findMany({
      where: { companyId: ctx.companyId },
      include: {
        routes: {
          orderBy: { sortOrder: "asc" },
          include: {
            seasons: {
              orderBy: { dateFrom: "desc" },
              include: { rates: { orderBy: { vehicleType: "asc" } } },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  }),

  createDestination: tourOpsProcedure
    .input(opsTransportDestinationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.opsTransportDestination.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  updateDestination: tourOpsProcedure
    .input(z.object({ id: z.string(), data: opsTransportDestinationUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const dest = await ctx.db.opsTransportDestination.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!dest) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsTransportDestination.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteDestination: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dest = await ctx.db.opsTransportDestination.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!dest) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsTransportDestination.delete({ where: { id: input.id } });
    }),

  // ── Routes ──

  listRoutes: tourOpsProcedure
    .input(z.object({ destinationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsTransportRoute.findMany({
        where: { companyId: ctx.companyId, destinationId: input.destinationId },
        include: {
          seasons: {
            orderBy: { dateFrom: "desc" },
            include: { rates: { orderBy: { vehicleType: "asc" } } },
          },
        },
        orderBy: { sortOrder: "asc" },
      });
    }),

  getRoute: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const route = await ctx.db.opsTransportRoute.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          destination: true,
          seasons: {
            orderBy: { dateFrom: "desc" },
            include: { rates: { orderBy: { vehicleType: "asc" } } },
          },
        },
      });
      if (!route) throw new TRPCError({ code: "NOT_FOUND" });
      return route;
    }),

  createRoute: tourOpsProcedure
    .input(opsTransportRouteCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.opsTransportRoute.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  updateRoute: tourOpsProcedure
    .input(z.object({ id: z.string(), data: opsTransportRouteUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const route = await ctx.db.opsTransportRoute.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!route) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsTransportRoute.update({ where: { id: input.id }, data: input.data });
    }),

  deleteRoute: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const route = await ctx.db.opsTransportRoute.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!route) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsTransportRoute.delete({ where: { id: input.id } });
    }),

  // ── Seasons & Rates ──

  addSeason: tourOpsProcedure
    .input(opsTransportSeasonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const route = await ctx.db.opsTransportRoute.findFirst({
        where: { id: input.routeId, companyId: ctx.companyId },
      });
      if (!route) throw new TRPCError({ code: "NOT_FOUND" });

      const { rates, ...seasonData } = input;
      return ctx.db.$transaction(async (tx) => {
        const season = await tx.opsTransportRateSeason.create({
          data: {
            ...seasonData,
            companyId: ctx.companyId,
            dateFrom: new Date(seasonData.dateFrom),
            dateTo: new Date(seasonData.dateTo),
          },
        });
        if (rates.length > 0) {
          await tx.opsTransportRate.createMany({
            data: rates.map((r) => ({
              ...r,
              seasonId: season.id,
              companyId: ctx.companyId,
            })),
          });
        }
        return tx.opsTransportRateSeason.findUniqueOrThrow({
          where: { id: season.id },
          include: { rates: { orderBy: { vehicleType: "asc" } } },
        });
      });
    }),

  updateSeason: tourOpsProcedure
    .input(z.object({ id: z.string(), data: opsTransportSeasonUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.opsTransportRateSeason.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!season) throw new TRPCError({ code: "NOT_FOUND" });

      const { rates, ...seasonData } = input.data;
      return ctx.db.$transaction(async (tx) => {
        await tx.opsTransportRateSeason.update({
          where: { id: input.id },
          data: {
            ...seasonData,
            dateFrom: seasonData.dateFrom ? new Date(seasonData.dateFrom) : undefined,
            dateTo: seasonData.dateTo ? new Date(seasonData.dateTo) : undefined,
          },
        });
        if (rates) {
          await tx.opsTransportRate.deleteMany({ where: { seasonId: input.id } });
          if (rates.length > 0) {
            await tx.opsTransportRate.createMany({
              data: rates.map((r) => ({
                ...r,
                seasonId: input.id,
                companyId: ctx.companyId,
              })),
            });
          }
        }
        return tx.opsTransportRateSeason.findUniqueOrThrow({
          where: { id: input.id },
          include: { rates: { orderBy: { vehicleType: "asc" } } },
        });
      });
    }),

  deleteSeason: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.opsTransportRateSeason.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!season) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.opsTransportRateSeason.delete({ where: { id: input.id } });
    }),

  // ── Bulk Import ──
  bulkImport: tourOpsProcedure
    .input(z.array(z.object({
      destinationCode: z.string(),
      destinationName: z.string(),
      routeNameEn: z.string(),
      routeNameAr: z.string().optional(),
      seasonName: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      isActive: z.boolean().optional(),
      rates: z.array(z.object({
        vehicleType: z.enum(["SEDAN", "VAN_11", "VAN_16", "BUS_25", "BUS_45"]),
        rentEGP: z.number(),
        tipEGP: z.number(),
        repAllowEGP: z.number(),
      })).optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      let created = 0;
      let updated = 0;

      for (const row of input) {
        if (!row.destinationCode || !row.routeNameEn) continue;

        // Upsert destination
        let dest = await ctx.db.opsTransportDestination.findFirst({
          where: { companyId: ctx.companyId, code: row.destinationCode },
        });
        if (!dest) {
          dest = await ctx.db.opsTransportDestination.create({
            data: { companyId: ctx.companyId, code: row.destinationCode, nameEn: row.destinationName || row.destinationCode },
          });
        }

        // Upsert route
        let route = await ctx.db.opsTransportRoute.findFirst({
          where: { companyId: ctx.companyId, destinationId: dest.id, nameEn: row.routeNameEn },
        });
        if (!route) {
          route = await ctx.db.opsTransportRoute.create({
            data: { companyId: ctx.companyId, destinationId: dest.id, nameEn: row.routeNameEn, nameAr: row.routeNameAr || null },
          });
          created++;
        }

        if (!row.seasonName || !row.dateFrom || !row.dateTo) continue;

        // Upsert season
        let season = await ctx.db.opsTransportRateSeason.findFirst({
          where: { companyId: ctx.companyId, routeId: route.id, name: row.seasonName },
        });
        if (!season) {
          season = await ctx.db.opsTransportRateSeason.create({
            data: {
              companyId: ctx.companyId,
              routeId: route.id,
              name: row.seasonName,
              dateFrom: new Date(row.dateFrom),
              dateTo: new Date(row.dateTo),
              isActive: row.isActive ?? true,
            },
          });
        } else {
          await ctx.db.opsTransportRateSeason.update({
            where: { id: season.id },
            data: { dateFrom: new Date(row.dateFrom), dateTo: new Date(row.dateTo), isActive: row.isActive ?? season.isActive },
          });
          updated++;
        }

        // Upsert rates
        if (row.rates && row.rates.length > 0) {
          for (const r of row.rates) {
            await ctx.db.opsTransportRate.upsert({
              where: { seasonId_vehicleType: { seasonId: season.id, vehicleType: r.vehicleType } },
              create: { companyId: ctx.companyId, seasonId: season.id, vehicleType: r.vehicleType, rentEGP: r.rentEGP, tipEGP: r.tipEGP, repAllowEGP: r.repAllowEGP },
              update: { rentEGP: r.rentEGP, tipEGP: r.tipEGP, repAllowEGP: r.repAllowEGP },
            });
          }
        }
      }

      return { created, updated };
    }),

  // ── Lookup: active rates for a route on a given date ──
  getActiveRates: tourOpsProcedure
    .input(z.object({ routeId: z.string(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ? new Date(input.date) : new Date();
      const season = await ctx.db.opsTransportRateSeason.findFirst({
        where: {
          routeId: input.routeId,
          companyId: ctx.companyId,
          isActive: true,
          dateFrom: { lte: date },
          dateTo: { gte: date },
        },
        include: { rates: { orderBy: { vehicleType: "asc" } } },
        orderBy: { dateFrom: "desc" },
      });
      return season;
    }),
});
