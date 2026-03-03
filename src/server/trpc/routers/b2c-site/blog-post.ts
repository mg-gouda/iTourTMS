import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import {
  blogPostCreateSchema,
  blogPostUpdateSchema,
} from "@/lib/validations/b2c-site";

export const blogPostRouter = createTRPCRouter({
  list: protectedProcedure
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

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.blogPost.findUnique({ where: { id: input.id } });
    }),

  create: protectedProcedure
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

  update: protectedProcedure
    .input(blogPostUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.blogPost.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.blogPost.delete({ where: { id: input.id } });
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.blogPost.update({
        where: { id: input.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    }),

  unpublish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.blogPost.update({
        where: { id: input.id },
        data: { status: "DRAFT" },
      });
    }),
});
