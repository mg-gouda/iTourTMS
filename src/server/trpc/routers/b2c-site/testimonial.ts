import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  testimonialCreateSchema,
  testimonialUpdateSchema,
} from "@/lib/validations/b2c-site";

const p = (code: string) => modulePermissionProcedure("b2c-site", code);

export const testimonialRouter = createTRPCRouter({
  list: p("b2c-site:testimonial:read").query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.testimonial.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: p("b2c-site:testimonial:create")
    .input(testimonialCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.testimonial.create({ data: { companyId, ...input } });
    }),

  update: p("b2c-site:testimonial:update")
    .input(testimonialUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, ...data } = input;
      await ctx.db.testimonial.findFirstOrThrow({ where: { id, companyId } });
      return ctx.db.testimonial.update({ where: { id }, data });
    }),

  delete: p("b2c-site:testimonial:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.testimonial.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.testimonial.delete({ where: { id: input.id } });
    }),

  toggleFeatured: p("b2c-site:testimonial:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const current = await ctx.db.testimonial.findFirstOrThrow({
        where: { id: input.id, companyId },
        select: { featured: true },
      });
      return ctx.db.testimonial.update({
        where: { id: input.id },
        data: { featured: !current.featured },
      });
    }),
});
