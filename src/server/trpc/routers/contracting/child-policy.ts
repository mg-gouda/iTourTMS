import { z } from "zod";

import { childPolicyCreateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const childPolicyRouter = createTRPCRouter({
  list: proc
    .input(z.object({ hotelId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.childPolicy.findMany({
        where: { hotelId: input.hotelId },
        orderBy: { ageFrom: "asc" },
      });
    }),

  upsert: proc
    .input(childPolicyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      const existing = await ctx.db.childPolicy.findUnique({
        where: {
          hotelId_category: {
            hotelId: input.hotelId,
            category: input.category,
          },
        },
      });

      if (existing) {
        return ctx.db.childPolicy.update({
          where: { id: existing.id },
          data: input,
        });
      }

      return ctx.db.childPolicy.create({ data: input });
    }),

  delete: proc
    .input(z.object({ id: z.string(), hotelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.childPolicy.delete({
        where: { id: input.id, hotelId: input.hotelId },
      });
    }),
});
