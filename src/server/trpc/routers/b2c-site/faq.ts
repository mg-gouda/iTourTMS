import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { faqCreateSchema, faqUpdateSchema, reorderSchema } from "@/lib/validations/b2c-site";

const p = (code: string) => modulePermissionProcedure("b2c-site", code);

export const faqRouter = createTRPCRouter({
  list: p("b2c-site:faq:read").query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId!;
    return ctx.db.faq.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  create: p("b2c-site:faq:create")
    .input(faqCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.faq.create({ data: { companyId, ...input } });
    }),

  update: p("b2c-site:faq:update")
    .input(faqUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      const { id, ...data } = input;
      await ctx.db.faq.findFirstOrThrow({ where: { id, companyId } });
      return ctx.db.faq.update({ where: { id }, data });
    }),

  delete: p("b2c-site:faq:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.faq.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.faq.delete({ where: { id: input.id } });
    }),

  reorder: p("b2c-site:faq:update")
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
