import { z } from "zod";

import { mealBasisCreateSchema, mealBasisUpdateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const mealBasisRouter = createTRPCRouter({
  list: proc
    .input(z.object({ hotelId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelMealBasis.findMany({
        where: { hotelId: input.hotelId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: proc
    .input(mealBasisCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelMealBasis.create({ data: input });
    }),

  update: proc
    .input(z.object({ id: z.string(), hotelId: z.string(), data: mealBasisUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelMealBasis.update({
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
      return ctx.db.hotelMealBasis.delete({
        where: { id: input.id, hotelId: input.hotelId },
      });
    }),
});
