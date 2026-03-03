import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import {
  heroSlideCreateSchema,
  heroSlideUpdateSchema,
  reorderSchema,
} from "@/lib/validations/b2c-site";

export const heroSlideRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.heroSlide.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  create: protectedProcedure
    .input(heroSlideCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.heroSlide.create({ data: { companyId, ...input } });
    }),

  update: protectedProcedure
    .input(heroSlideUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.heroSlide.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.heroSlide.delete({ where: { id: input.id } });
    }),

  reorder: protectedProcedure
    .input(reorderSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.items.map((item) =>
          ctx.db.heroSlide.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );
    }),
});
