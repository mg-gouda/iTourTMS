import { z } from "zod";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const financeProcedure = moduleProcedure("finance");

export const analyticRouter = createTRPCRouter({
  listAccounts: financeProcedure
    .input(z.object({ isActive: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.analyticAccount.findMany({
        where: { companyId: ctx.session.user.companyId, ...(input.isActive !== undefined && input.isActive !== null ? { isActive: input.isActive } : {}) },
        include: { partner: { select: { id: true, name: true } } },
        orderBy: [{ code: "asc" }, { name: "asc" }],
      });
    }),

  createAccount: financeProcedure
    .input(z.object({ code: z.string().optional(), name: z.string().min(1), partnerId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { code, partnerId, ...rest } = input;
      return ctx.db.analyticAccount.create({
        data: { ...rest, ...(code ? { code } : {}), ...(partnerId ? { partnerId } : {}), companyId: ctx.session.user.companyId },
      });
    }),

  updateAccount: financeProcedure
    .input(z.object({ id: z.string(), code: z.string().optional(), name: z.string().min(1).optional(), partnerId: z.string().optional().nullable(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, partnerId, ...rest } = input;
      return ctx.db.analyticAccount.update({
        where: { id, companyId: ctx.session.user.companyId },
        data: { ...rest, partnerId: partnerId ?? undefined },
      });
    }),

  listItems: financeProcedure
    .input(z.object({
      analyticAccountId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { analyticAccountId, dateFrom, dateTo, page, pageSize } = input;
      const where: Record<string, unknown> = {
        move: { companyId: ctx.session.user.companyId, state: "POSTED" },
        analyticAccountId: analyticAccountId ?? { not: null },
      };
      if (dateFrom || dateTo) {
        where.move = { ...where.move as object, date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } };
      }
      const [items, total] = await Promise.all([
        ctx.db.moveLineItem.findMany({
          where,
          include: {
            move: { select: { id: true, name: true, date: true, moveType: true } },
            account: { select: { id: true, code: true, name: true } },
            analyticAccount: { select: { id: true, code: true, name: true } },
            partner: { select: { id: true, name: true } },
          },
          orderBy: { move: { date: "desc" } },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.moveLineItem.count({ where }),
      ]);
      return { items, total, pages: Math.ceil(total / pageSize) };
    }),
});
