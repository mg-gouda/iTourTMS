import { z } from "zod";

import { roomTypeCreateSchema, roomTypeUpdateSchema, occupancyCreateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const roomTypeRouter = createTRPCRouter({
  list: proc
    .input(z.object({ hotelId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelRoomType.findMany({
        where: { hotelId: input.hotelId },
        include: {
          _count: { select: { occupancyTable: true } },
        },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: proc
    .input(roomTypeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelRoomType.create({ data: input });
    }),

  update: proc
    .input(z.object({ id: z.string(), hotelId: z.string(), data: roomTypeUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelRoomType.update({
        where: { id: input.id, hotelId: input.hotelId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string(), hotelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelRoomType.delete({
        where: { id: input.id, hotelId: input.hotelId },
      });
    }),

  // ── Occupancy Table ──

  listOccupancy: proc
    .input(z.object({ roomTypeId: z.string(), hotelId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.roomTypeOccupancy.findMany({
        where: { roomTypeId: input.roomTypeId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  createOccupancy: proc
    .input(occupancyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify room type belongs to company's hotel
      const rt = await ctx.db.hotelRoomType.findFirstOrThrow({
        where: { id: input.roomTypeId },
        include: { hotel: { select: { companyId: true } } },
      });
      if (rt.hotel.companyId !== ctx.companyId) {
        throw new Error("Room type not found");
      }
      return ctx.db.roomTypeOccupancy.create({ data: input });
    }),

  deleteOccupancy: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const occ = await ctx.db.roomTypeOccupancy.findFirstOrThrow({
        where: { id: input.id },
        include: { roomType: { include: { hotel: { select: { companyId: true } } } } },
      });
      if (occ.roomType.hotel.companyId !== ctx.companyId) {
        throw new Error("Not found");
      }
      return ctx.db.roomTypeOccupancy.delete({ where: { id: input.id } });
    }),
});
