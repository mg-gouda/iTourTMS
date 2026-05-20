import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  heroSlideCreateSchema,
  heroSlideUpdateSchema,
  reorderSchema,
} from "@/lib/validations/b2c-site";

const p = (code: string) => modulePermissionProcedure("b2c-site", code);

export const heroSlideRouter = createTRPCRouter({
  list: p("b2c-site:heroSlide:read").query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.heroSlide.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  create: p("b2c-site:heroSlide:create")
    .input(heroSlideCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.heroSlide.create({ data: { companyId, ...input } });
    }),

  update: p("b2c-site:heroSlide:update")
    .input(heroSlideUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, ...data } = input;
      await ctx.db.heroSlide.findFirstOrThrow({ where: { id, companyId } });
      return ctx.db.heroSlide.update({ where: { id }, data });
    }),

  delete: p("b2c-site:heroSlide:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.heroSlide.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.heroSlide.delete({ where: { id: input.id } });
    }),

  reorder: p("b2c-site:heroSlide:update")
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
