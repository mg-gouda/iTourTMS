import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import {
  publicPageCreateSchema,
  publicPageUpdateSchema,
} from "@/lib/validations/b2c-site";

export const publicPageRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.publicPage.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.publicPage.findFirst({
        where: { id: input.id, companyId },
      });
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.publicPage.findUnique({
        where: { companyId_slug: { companyId, slug: input.slug } },
      });
    }),

  create: protectedProcedure
    .input(publicPageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.publicPage.create({ data: { companyId, ...input } });
    }),

  update: protectedProcedure
    .input(publicPageUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, ...data } = input;
      await ctx.db.publicPage.findFirstOrThrow({ where: { id, companyId } });
      return ctx.db.publicPage.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.publicPage.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.publicPage.delete({ where: { id: input.id } });
    }),
});
