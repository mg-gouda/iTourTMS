import { z } from "zod";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const auditTrailRouter = createTRPCRouter({
  list: financeProcedure
    .input(z.object({
      modelName: z.string().optional(),
      recordId: z.string().optional(),
      action: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { modelName, recordId, action, dateFrom, dateTo, page, pageSize } = input;
      const where: Record<string, unknown> = { companyId: ctx.session.user.companyId };
      if (modelName) where.modelName = modelName;
      if (recordId) where.recordId = recordId;
      if (action) where.action = action;
      if (dateFrom || dateTo) {
        where.createdAt = {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
        };
      }
      const [items, total] = await Promise.all([
        ctx.db.auditTrailEntry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.auditTrailEntry.count({ where }),
      ]);
      return { items, total, pages: Math.ceil(total / pageSize) };
    }),

  log: financeProcedure
    .input(z.object({
      modelName: z.string(),
      recordId: z.string(),
      recordName: z.string().optional(),
      action: z.string(),
      changes: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { recordName, changes, ...rest } = input;
      return ctx.db.auditTrailEntry.create({
        data: {
          companyId: ctx.session.user.companyId,
          userId: ctx.session.user.id,
          userName: ctx.session.user.name ?? ctx.session.user.email ?? "Unknown",
          ...rest,
          ...(recordName ? { recordName } : {}),
          ...(changes ? { changes } : {}),
        },
      });
    }),
});
