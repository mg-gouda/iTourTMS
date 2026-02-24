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

  create: proc
    .input(childPolicyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      return ctx.db.childPolicy.create({ data: input });
    }),

  update: proc
    .input(
      z.object({
        id: z.string().min(1),
        hotelId: z.string().min(1),
        category: z.enum(["INFANT", "CHILD", "TEEN"]).optional(),
        ageFrom: z.number().int().min(0).optional(),
        ageTo: z.number().int().min(0).optional(),
        label: z.string().min(1).optional(),
        freeInSharing: z.boolean().optional(),
        maxFreePerRoom: z.number().int().min(0).optional(),
        extraBedAllowed: z.boolean().optional(),
        mealsIncluded: z.boolean().optional(),
        notes: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      const { id, hotelId, ...data } = input;
      return ctx.db.childPolicy.update({
        where: { id, hotelId },
        data,
      });
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
