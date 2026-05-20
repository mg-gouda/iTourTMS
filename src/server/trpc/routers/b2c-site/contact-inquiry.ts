import { z } from "zod";

import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { contactInquiryReplySchema } from "@/lib/validations/b2c-site";

const p = (code: string) => modulePermissionProcedure("b2c-site", code);

export const contactInquiryRouter = createTRPCRouter({
  list: p("b2c-site:inquiry:read")
    .input(
      z
        .object({
          status: z.enum(["NEW", "READ", "REPLIED", "ARCHIVED"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.contactInquiry.findMany({
        where: {
          companyId,
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: p("b2c-site:inquiry:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      return ctx.db.contactInquiry.findFirst({ where: { id: input.id, companyId } });
    }),

  markRead: p("b2c-site:inquiry:manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.contactInquiry.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.contactInquiry.update({
        where: { id: input.id },
        data: { status: "READ" },
      });
    }),

  reply: p("b2c-site:inquiry:manage")
    .input(contactInquiryReplySchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.contactInquiry.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.contactInquiry.update({
        where: { id: input.id },
        data: {
          reply: input.reply,
          status: "REPLIED",
          repliedAt: new Date(),
        },
      });
    }),

  delete: p("b2c-site:inquiry:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId!;
      await ctx.db.contactInquiry.findFirstOrThrow({ where: { id: input.id, companyId } });
      return ctx.db.contactInquiry.delete({ where: { id: input.id } });
    }),
});
