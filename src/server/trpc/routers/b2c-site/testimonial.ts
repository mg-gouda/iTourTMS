import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import {
  testimonialCreateSchema,
  testimonialUpdateSchema,
} from "@/lib/validations/b2c-site";

export const testimonialRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.testimonial.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(testimonialCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.testimonial.create({ data: { companyId, ...input } });
    }),

  update: protectedProcedure
    .input(testimonialUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.testimonial.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.testimonial.delete({ where: { id: input.id } });
    }),

  toggleFeatured: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.testimonial.findUniqueOrThrow({
        where: { id: input.id },
        select: { featured: true },
      });
      return ctx.db.testimonial.update({
        where: { id: input.id },
        data: { featured: !current.featured },
      });
    }),
});
