import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("tour-ops", code);

export const opsReportsRouter = createTRPCRouter({
  pnlSummary: p("tour-ops:report:read")
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        clientType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const fileWhere: Record<string, unknown> = {
        companyId: ctx.companyId,
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
      };
      if (input.clientType) fileWhere.clientType = input.clientType;
      if (input.dateFrom || input.dateTo) {
        fileWhere.travelFrom = {
          ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
          ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
        };
      }

      const files = await ctx.db.opsFile.findMany({
        where: fileWhere,
        include: { pnl: true },
        orderBy: { travelFrom: "asc" },
      });

      const totalBudgetedRevenue = files.reduce((s, f) => s + Number(f.pnl?.budgetedRevenue ?? 0), 0);
      const totalBudgetedCost = files.reduce((s, f) => s + Number(f.pnl?.budgetedCost ?? 0), 0);
      const totalActualRevenue = files.reduce((s, f) => s + Number(f.pnl?.actualRevenue ?? 0), 0);
      const totalActualCost = files.reduce((s, f) => s + Number(f.pnl?.actualCost ?? 0), 0);

      return {
        files,
        summary: {
          totalBudgetedRevenue,
          totalBudgetedCost,
          totalActualRevenue,
          totalActualCost,
          budgetedMargin: totalBudgetedRevenue - totalBudgetedCost,
          actualMargin: totalActualRevenue - totalActualCost,
        },
      };
    }),

  revenueByPeriod: p("tour-ops:report:read")
    .input(
      z.object({
        year: z.number().int().optional(),
        groupBy: z.enum(["month", "quarter"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      const year = input.year ?? new Date().getFullYear();
      const quotations = await ctx.db.opsQuotation.findMany({
        where: {
          companyId: ctx.companyId,
          isFinal: true,
          file: {
            travelFrom: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${year + 1}-01-01`),
            },
          },
        },
        include: { file: { select: { travelFrom: true, clientType: true } } },
      });

      const grouped: Record<string, { revenue: number; cost: number; margin: number; count: number }> = {};
      for (const q of quotations) {
        const date = q.file.travelFrom;
        const key =
          input.groupBy === "month"
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            : `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
        if (!grouped[key]) grouped[key] = { revenue: 0, cost: 0, margin: 0, count: 0 };
        grouped[key].revenue += Number(q.totalSelling);
        grouped[key].cost += Number(q.totalCost);
        grouped[key].margin += Number(q.margin);
        grouped[key].count += 1;
      }

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, data]) => ({ period, ...data }));
    }),

  filesByStatus: p("tour-ops:report:read").query(async ({ ctx }) => {
    const counts = await ctx.db.opsFile.groupBy({
      by: ["status"],
      where: { companyId: ctx.companyId },
      _count: { _all: true },
    });
    return counts;
  }),
});
