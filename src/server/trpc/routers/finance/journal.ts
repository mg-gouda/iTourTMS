import { z } from "zod";

import { journalSchema } from "@/lib/validations/finance";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

export const journalRouter = createTRPCRouter({
  list: p("finance:journal:read")
    .input(
      z.object({
        type: z.enum(["SALE", "PURCHASE", "CASH", "BANK", "CREDIT_CARD", "GENERAL"]).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { companyId: ctx.companyId };
      if (input?.type) where.type = input.type;

      return ctx.db.journal.findMany({
        where: where as any,
        include: {
          defaultAccount: true,
          suspenseAccount: true,
          currency: true,
        },
        orderBy: { code: "asc" },
      });
    }),

  getById: p("finance:journal:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.journal.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          defaultAccount: true,
          suspenseAccount: true,
          profitAccount: true,
          lossAccount: true,
          currency: true,
        },
      });
    }),

  create: p("finance:journal:create")
    .input(journalSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.journal.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("finance:journal:update")
    .input(z.object({ id: z.string() }).merge(journalSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.journal.update({ where: { id }, data });
    }),

  delete: p("finance:journal:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.journal.delete({ where: { id: input.id } });
    }),
});
