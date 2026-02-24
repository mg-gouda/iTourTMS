import { z } from "zod";

import { hotelCreateSchema, hotelUpdateSchema, hotelImageCreateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const hotelRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.hotel.findMany({
      where: { companyId: ctx.companyId },
      include: {
        country: { select: { id: true, name: true, code: true } },
        destination: { select: { id: true, name: true } },
        cityRel: { select: { id: true, name: true, code: true } },
        _count: { select: { roomTypes: true, mealBasis: true, childrenPolicies: true, images: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.hotel.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          country: { select: { id: true, name: true, code: true } },
          state: { select: { id: true, name: true } },
          destination: { select: { id: true, name: true, code: true } },
          cityRel: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
          amenities: { orderBy: { name: "asc" } },
          roomTypes: {
            include: {
              occupancyTable: { orderBy: { sortOrder: "asc" } },
            },
            orderBy: { sortOrder: "asc" },
          },
          childrenPolicies: { orderBy: { ageFrom: "asc" } },
          mealBasis: { orderBy: { sortOrder: "asc" } },
          images: { orderBy: { sortOrder: "asc" } },
        },
      });
    }),

  create: proc
    .input(hotelCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { amenityIds, ...data } = input;
      return ctx.db.hotel.create({
        data: {
          ...data,
          companyId: ctx.companyId,
          amenities: amenityIds.length
            ? { connect: amenityIds.map((id) => ({ id })) }
            : undefined,
        },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: hotelUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const { amenityIds, ...data } = input.data;
      return ctx.db.hotel.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: {
          ...data,
          amenities: amenityIds !== undefined
            ? { set: amenityIds.map((id) => ({ id })) }
            : undefined,
        },
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.hotel.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  // ── Hotel Code Auto-generation ──

  getNextHotelCode: proc
    .input(z.object({ zoneId: z.string() }))
    .query(async ({ ctx, input }) => {
      const zone = await ctx.db.zone.findFirstOrThrow({
        where: { id: input.zoneId, companyId: ctx.companyId },
        include: { city: { select: { code: true } } },
      });
      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { hotelCodePrefix: true },
      });
      const prefix = company.hotelCodePrefix ?? "H";
      const count = await ctx.db.hotel.count({
        where: { zoneId: input.zoneId, companyId: ctx.companyId },
      });
      const increment = String(count + 1).padStart(2, "0");
      return `${prefix}${zone.city.code}${zone.code}${increment}`;
    }),

  // ── Amenities (company-level) ──

  listAmenities: proc.query(async ({ ctx }) => {
    return ctx.db.hotelAmenity.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { name: "asc" },
    });
  }),

  createAmenity: proc
    .input(z.object({ name: z.string().min(1), icon: z.string().nullish(), category: z.string().nullish() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.hotelAmenity.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  deleteAmenity: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.hotelAmenity.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  // ── Images ──

  addImage: proc
    .input(hotelImageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify hotel belongs to company
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      // If setting as primary, unset others
      if (input.isPrimary) {
        await ctx.db.hotelImage.updateMany({
          where: { hotelId: input.hotelId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return ctx.db.hotelImage.create({ data: input });
    }),

  updateImage: proc
    .input(z.object({
      id: z.string(),
      hotelId: z.string(),
      caption: z.string().nullish(),
      sortOrder: z.number().int().optional(),
      isPrimary: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      if (input.isPrimary) {
        await ctx.db.hotelImage.updateMany({
          where: { hotelId: input.hotelId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const { hotelId, ...data } = input;
      return ctx.db.hotelImage.update({
        where: { id: input.id },
        data,
      });
    }),

  deleteImage: proc
    .input(z.object({ id: z.string(), hotelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelImage.delete({ where: { id: input.id } });
    }),
});
