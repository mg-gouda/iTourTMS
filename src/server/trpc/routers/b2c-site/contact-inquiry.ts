import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { contactInquiryReplySchema } from "@/lib/validations/b2c-site";

export const contactInquiryRouter = createTRPCRouter({
  list: protectedProcedure
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

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contactInquiry.findUnique({ where: { id: input.id } });
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contactInquiry.update({
        where: { id: input.id },
        data: { status: "READ" },
      });
    }),

  reply: protectedProcedure
    .input(contactInquiryReplySchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contactInquiry.update({
        where: { id: input.id },
        data: {
          reply: input.reply,
          status: "REPLIED",
          repliedAt: new Date(),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contactInquiry.delete({ where: { id: input.id } });
    }),
});
