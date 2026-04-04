import { z } from "zod";

import { cityCreateSchema, cityUpdateSchema, destinationCreateSchema, destinationUpdateSchema, zoneCreateSchema, zoneUpdateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { withCache, invalidateCache } from "@/server/redis";

const proc = moduleProcedure("contracting");

export const destinationRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return withCache(
      `destinations:${ctx.companyId}`,
      () =>
        ctx.db.destination.findMany({
          where: { companyId: ctx.companyId },
          include: {
            country: { select: { id: true, name: true, code: true } },
            _count: { select: { hotels: true, cities: true } },
          },
          orderBy: { name: "asc" },
        }),
      3600, // 1 hour cache
    );
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.destination.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          country: { select: { id: true, name: true, code: true } },
          cities: {
            select: { id: true, name: true, code: true, active: true },
            orderBy: { name: "asc" },
          },
          hotels: {
            select: {
              id: true,
              name: true,
              code: true,
              starRating: true,
              city: true,
              cityRel: { select: { id: true, name: true, code: true } },
              active: true,
            },
            orderBy: { name: "asc" },
          },
        },
      });
    }),

  create: proc
    .input(destinationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.destination.findFirst({
        where: { companyId: ctx.companyId, code: input.code },
      });
      if (existing) {
        throw new Error(`A destination with code "${input.code}" already exists.`);
      }
      const dest = await ctx.db.destination.create({
        data: { ...input, companyId: ctx.companyId },
      });
      await invalidateCache(`destinations:${ctx.companyId}`);
      return dest;
    }),

  update: proc
    .input(z.object({ id: z.string(), data: destinationUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const dest = await ctx.db.destination.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
      await invalidateCache(`destinations:${ctx.companyId}`);
      return dest;
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hotelCount = await ctx.db.hotel.count({
        where: { destinationId: input.id, companyId: ctx.companyId },
      });
      if (hotelCount > 0) {
        throw new Error("Cannot delete destination with linked hotels. Remove hotels first.");
      }
      const dest = await ctx.db.destination.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
      await invalidateCache(`destinations:${ctx.companyId}`);
      return dest;
    }),

  // ── City CRUD ──

  listAllCities: proc.query(async ({ ctx }) => {
    return ctx.db.city.findMany({
      where: { companyId: ctx.companyId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),

  listCities: proc
    .input(z.object({ destinationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.city.findMany({
        where: {
          destinationId: input.destinationId,
          companyId: ctx.companyId,
        },
        orderBy: { name: "asc" },
      });
    }),

  createCity: proc
    .input(cityCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.destination.findFirstOrThrow({
        where: { id: input.destinationId, companyId: ctx.companyId },
      });
      return ctx.db.city.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  updateCity: proc
    .input(z.object({ id: z.string(), data: cityUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.city.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      return ctx.db.city.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteCity: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hotelCount = await ctx.db.hotel.count({
        where: { cityId: input.id, companyId: ctx.companyId },
      });
      if (hotelCount > 0) {
        throw new Error("Cannot delete city with linked hotels. Reassign hotels first.");
      }
      return ctx.db.city.delete({
        where: { id: input.id },
      });
    }),

  // ── Zone CRUD ──

  listAllZones: proc.query(async ({ ctx }) => {
    return ctx.db.zone.findMany({
      where: { companyId: ctx.companyId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }),

  listZones: proc
    .input(z.object({ cityId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.zone.findMany({
        where: {
          cityId: input.cityId,
          companyId: ctx.companyId,
        },
        orderBy: { code: "asc" },
      });
    }),

  createZone: proc
    .input(zoneCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.city.findFirstOrThrow({
        where: { id: input.cityId, companyId: ctx.companyId },
      });
      return ctx.db.zone.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  updateZone: proc
    .input(z.object({ id: z.string(), data: zoneUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.zone.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      return ctx.db.zone.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteZone: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hotelCount = await ctx.db.hotel.count({
        where: { zoneId: input.id, companyId: ctx.companyId },
      });
      if (hotelCount > 0) {
        throw new Error("Cannot delete zone with linked hotels. Reassign hotels first.");
      }
      return ctx.db.zone.delete({
        where: { id: input.id },
      });
    }),
});
