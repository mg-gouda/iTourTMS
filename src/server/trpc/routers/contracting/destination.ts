import { z } from "zod";

import { destinationCreateSchema, destinationUpdateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const destinationRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.destination.findMany({
      where: { companyId: ctx.companyId },
      include: {
        country: { select: { id: true, name: true, code: true } },
        _count: { select: { hotels: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.destination.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          country: { select: { id: true, name: true, code: true } },
          hotels: {
            select: { id: true, name: true, code: true, starRating: true, city: true, active: true },
            orderBy: { name: "asc" },
          },
        },
      });
    }),

  create: proc
    .input(destinationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.destination.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: destinationUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.destination.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
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
      return ctx.db.destination.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
