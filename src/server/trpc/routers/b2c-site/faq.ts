import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { faqCreateSchema, faqUpdateSchema, reorderSchema } from "@/lib/validations/b2c-site";

export const faqRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.faq.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  create: protectedProcedure
    .input(faqCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.faq.create({ data: { companyId, ...input } });
    }),

  update: protectedProcedure
    .input(faqUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, ...data } = input;
      await ctx.db.faq.findFirstOrThrow({ where: { id, companyId } });
      return ctx.db.faq.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.faq.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.faq.delete({ where: { id: input.id } });
    }),

  reorder: protectedProcedure
    .input(reorderSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.items.map((item) =>
          ctx.db.faq.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );
    }),
});
