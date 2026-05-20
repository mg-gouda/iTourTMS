import { z } from "zod";

import { mealBasisCreateSchema, mealBasisUpdateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("contracting", code);

export const mealBasisRouter = createTRPCRouter({
  list: p("contracting:mealBasis:read")
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

  create: p("contracting:mealBasis:create")
    .input(mealBasisCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.hotelMealBasis.create({ data: input });
    }),

  update: p("contracting:mealBasis:update")
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

  delete: p("contracting:mealBasis:delete")
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
