import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import {
  blogPostCreateSchema,
  blogPostUpdateSchema,
} from "@/lib/validations/b2c-site";

const p = (code: string) => modulePermissionProcedure("b2c-site", code);

export const blogPostRouter = createTRPCRouter({
  list: p("b2c-site:blog:read")
    .input(
      z
        .object({
          status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.blogPost.findMany({
        where: {
          companyId,
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: p("b2c-site:blog:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.blogPost.findFirst({ where: { id: input.id, companyId } });
    }),

  create: p("b2c-site:blog:create")
    .input(blogPostCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.blogPost.create({
        data: {
          companyId,
          ...input,
          publishedAt: input.status === "PUBLISHED" ? new Date() : null,
        },
      });
    }),

  update: p("b2c-site:blog:update")
    .input(blogPostUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, ...data } = input;
      await ctx.db.blogPost.findFirstOrThrow({ where: { id, companyId } });
      return ctx.db.blogPost.update({ where: { id }, data });
    }),

  delete: p("b2c-site:blog:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.blogPost.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.blogPost.delete({ where: { id: input.id } });
    }),

  publish: p("b2c-site:blog:manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.blogPost.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.blogPost.update({
        where: { id: input.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    }),

  unpublish: p("b2c-site:blog:manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.blogPost.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.blogPost.update({
        where: { id: input.id },
        data: { status: "DRAFT" },
      });
    }),
});
