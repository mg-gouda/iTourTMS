import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const tourOpsProcedure = moduleProcedure("tour-ops");

export const opsPnlRouter = createTRPCRouter({
  getByFileId: tourOpsProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.db.opsFile.findFirst({
        where: { id: input.fileId, companyId: ctx.companyId },
        include: { pnl: true },
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });
      return file.pnl;
    }),

  recalculate: tourOpsProcedure
    .input(
      z.object({
        fileId: z.string(),
        actualCost: z.number().min(0).optional(),
        actualRevenue: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.opsFile.findFirst({
        where: { id: input.fileId, companyId: ctx.companyId },
        include: { pnl: true },
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      const finalQuotation = await ctx.db.opsQuotation.findFirst({
        where: { fileId: input.fileId, isFinal: true },
        orderBy: { createdAt: "desc" },
      });

      const budgetedCost = Number(finalQuotation?.totalCost ?? file.pnl?.budgetedCost ?? 0);
      const budgetedRevenue = Number(finalQuotation?.totalSelling ?? file.pnl?.budgetedRevenue ?? 0);
      const actualCost = input.actualCost ?? Number(file.pnl?.actualCost ?? 0);
      const actualRevenue = input.actualRevenue ?? Number(file.pnl?.actualRevenue ?? 0);
      const variance = actualRevenue - actualCost - (budgetedRevenue - budgetedCost);

      return ctx.db.opsPnL.upsert({
        where: { fileId: input.fileId },
        create: { fileId: input.fileId, budgetedCost, budgetedRevenue, actualCost, actualRevenue, variance },
        update: { budgetedCost, budgetedRevenue, actualCost, actualRevenue, variance },
      });
    }),

  close: tourOpsProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pnl = await ctx.db.opsPnL.findUnique({ where: { fileId: input.fileId } });
      if (!pnl) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsPnL.update({
        where: { fileId: input.fileId },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }),
});
