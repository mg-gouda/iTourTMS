import { z } from "zod";

import { childPolicyCreateSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("contracting", code);

export const childPolicyRouter = createTRPCRouter({
  list: p("contracting:policy:read")
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

  create: p("contracting:policy:create")
    .input(childPolicyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      return ctx.db.childPolicy.create({ data: input });
    }),

  update: p("contracting:policy:update")
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
        chargePercentage: z.number().int().min(0).max(100).optional(),
        notes: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });

      const { id, hotelId: _hotelId, ...data } = input;
      return ctx.db.childPolicy.update({
        where: { id },
        data,
      });
    }),

  delete: p("contracting:policy:delete")
    .input(z.object({ id: z.string(), hotelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hotel.findFirstOrThrow({
        where: { id: input.hotelId, companyId: ctx.companyId },
      });
      return ctx.db.childPolicy.delete({
        where: { id: input.id },
      });
    }),
});
