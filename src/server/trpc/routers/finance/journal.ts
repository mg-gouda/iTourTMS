import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { journalSchema } from "@/lib/validations/finance";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { patch } from "@/lib/validations/patch";

const p = (code: string) => modulePermissionProcedure("finance", code);

/** Journals are scoped without stamping, so a named branch is checked here. */
function assertOwnBranch(ids: string[], branchId: string | null | undefined) {
  if (branchId && !ids.includes(branchId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "That branch is not one of yours." });
  }
}

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
      assertOwnBranch(ctx.branch.ids, input.branchId);
      return ctx.db.journal.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("finance:journal:update")
    .input(z.object({ id: z.string() }).merge(patch(journalSchema)))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      assertOwnBranch(ctx.branch.ids, data.branchId);
      const owned = await ctx.db.journal.findFirst({
        where: { id, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.journal.update({ where: { id }, data });
    }),

  delete: p("finance:journal:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.journal.deleteMany({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),
});
