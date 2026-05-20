import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  publicPageCreateSchema,
  publicPageUpdateSchema,
} from "@/lib/validations/b2c-site";

const p = (code: string) => modulePermissionProcedure("b2c-site", code);

export const publicPageRouter = createTRPCRouter({
  list: p("b2c-site:page:read").query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.publicPage.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  getById: p("b2c-site:page:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.publicPage.findFirst({
        where: { id: input.id, companyId },
      });
    }),

  getBySlug: p("b2c-site:page:read")
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.publicPage.findUnique({
        where: { companyId_slug: { companyId, slug: input.slug } },
      });
    }),

  create: p("b2c-site:page:create")
    .input(publicPageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.publicPage.create({ data: { companyId, ...input } });
    }),

  update: p("b2c-site:page:update")
    .input(publicPageUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, ...data } = input;
      await ctx.db.publicPage.findFirstOrThrow({ where: { id, companyId } });
      return ctx.db.publicPage.update({ where: { id }, data });
    }),

  delete: p("b2c-site:page:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.publicPage.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.publicPage.delete({ where: { id: input.id } });
    }),
});
