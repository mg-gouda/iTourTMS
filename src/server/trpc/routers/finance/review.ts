import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("finance", code);

const paginationInput = z.object({ page: z.number().default(1), pageSize: z.number().default(50) });

export const reviewRouter = createTRPCRouter({
  // CONTROL — Journal Items (granular move line view)
  journalItems: p("finance:auditTrail:read")
    .input(z.object({
      journalId: z.string().optional(),
      accountId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      unreconciled: z.boolean().optional(),
    }).merge(paginationInput))
    .query(async ({ ctx, input }) => {
      const { journalId, accountId, dateFrom, dateTo, unreconciled, page, pageSize } = input;
      const where: Record<string, unknown> = {
        move: {
          companyId: ctx.companyId,
          state: "POSTED",
          ...(journalId ? { journalId } : {}),
          ...(dateFrom || dateTo ? {
            date: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          } : {}),
        },
        ...(accountId ? { accountId } : {}),
        ...(unreconciled ? { debitReconciles: { none: {} }, creditReconciles: { none: {} }, account: { reconcile: true } } : {}),
      };
      const [items, total] = await Promise.all([
        ctx.db.moveLineItem.findMany({
          where,
          include: {
            move: { select: { id: true, name: true, date: true, moveType: true, journal: { select: { id: true, code: true, name: true } } } },
            account: { select: { id: true, code: true, name: true } },
            partner: { select: { id: true, name: true } },
            analyticAccount: { select: { id: true, code: true, name: true } },
          },
          orderBy: { move: { date: "desc" } },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.moveLineItem.count({ where }),
      ]);
      return { items, total, pages: Math.ceil(total / pageSize) };
    }),

  // CONTROL — Journal Audit (move-level audit view with state transitions)
  journalAudit: p("finance:auditTrail:read")
    .input(z.object({
      journalId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).merge(paginationInput))
    .query(async ({ ctx, input }) => {
      const { journalId, dateFrom, dateTo, page, pageSize } = input;
      const [items, total] = await Promise.all([
        ctx.db.move.findMany({
          where: {
            companyId: ctx.companyId,
            ...(journalId ? { journalId } : {}),
            ...(dateFrom || dateTo ? { date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } } : {}),
          },
          include: {
            journal: { select: { id: true, code: true, name: true } },
            partner: { select: { id: true, name: true } },
            _count: { select: { lineItems: true } },
          },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.move.count({
          where: {
            companyId: ctx.companyId,
            ...(journalId ? { journalId } : {}),
          },
        }),
      ]);
      return { items, total, pages: Math.ceil(total / pageSize) };
    }),

  // PURCHASES — Bill To Receive (vendor bills in DRAFT)
  billToReceive: p("finance:auditTrail:read")
    .input(paginationInput)
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      const [items, total] = await Promise.all([
        ctx.db.move.findMany({
          where: { companyId: ctx.companyId, moveType: "IN_INVOICE", state: "DRAFT" },
          include: {
            journal: { select: { code: true, name: true } },
            partner: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.move.count({ where: { companyId: ctx.companyId, moveType: "IN_INVOICE", state: "DRAFT" } }),
      ]);
      return { items, total, pages: Math.ceil(total / pageSize) };
    }),

  // PURCHASES — Billed Not Received (posted vendor bills with outstanding amount)
  billedNotReceived: p("finance:auditTrail:read")
    .input(paginationInput)
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      const [items, total] = await Promise.all([
        ctx.db.move.findMany({
          where: {
            companyId: ctx.companyId,
            moveType: "IN_INVOICE",
            state: "POSTED",
            paymentState: { in: ["NOT_PAID", "PARTIAL"] },
          },
          include: {
            journal: { select: { code: true, name: true } },
            partner: { select: { id: true, name: true } },
          },
          orderBy: { invoiceDateDue: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.move.count({
          where: { companyId: ctx.companyId, moveType: "IN_INVOICE", state: "POSTED", paymentState: { in: ["NOT_PAID", "PARTIAL"] } },
        }),
      ]);
      return { items, total, pages: Math.ceil(total / pageSize) };
    }),

  // SALES — Invoices To Be Issued (out invoices in DRAFT)
  invoicesToBeIssued: p("finance:auditTrail:read")
    .input(paginationInput)
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      const [items, total] = await Promise.all([
        ctx.db.move.findMany({
          where: { companyId: ctx.companyId, moveType: "OUT_INVOICE", state: "DRAFT" },
          include: {
            journal: { select: { code: true, name: true } },
            partner: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.move.count({ where: { companyId: ctx.companyId, moveType: "OUT_INVOICE", state: "DRAFT" } }),
      ]);
      return { items, total, pages: Math.ceil(total / pageSize) };
    }),

  // SALES — Invoiced Not Delivered (posted out invoices with outstanding amount)
  invoicedNotDelivered: p("finance:auditTrail:read")
    .input(paginationInput)
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      const [items, total] = await Promise.all([
        ctx.db.move.findMany({
          where: {
            companyId: ctx.companyId,
            moveType: "OUT_INVOICE",
            state: "POSTED",
            paymentState: { in: ["NOT_PAID", "PARTIAL"] },
          },
          include: {
            journal: { select: { code: true, name: true } },
            partner: { select: { id: true, name: true } },
          },
          orderBy: { invoiceDateDue: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.move.count({
          where: { companyId: ctx.companyId, moveType: "OUT_INVOICE", state: "POSTED", paymentState: { in: ["NOT_PAID", "PARTIAL"] } },
        }),
      ]);
      return { items, total, pages: Math.ceil(total / pageSize) };
    }),

  // Summary counts for dashboard badges
  counts: p("finance:auditTrail:read").query(async ({ ctx }) => {
    const companyId = ctx.companyId;
    const [billToReceive, billedNotReceived, invoicesToBeIssued, invoicedNotDelivered] = await Promise.all([
      ctx.db.move.count({ where: { companyId, moveType: "IN_INVOICE", state: "DRAFT" } }),
      ctx.db.move.count({ where: { companyId, moveType: "IN_INVOICE", state: "POSTED", paymentState: { in: ["NOT_PAID", "PARTIAL"] } } }),
      ctx.db.move.count({ where: { companyId, moveType: "OUT_INVOICE", state: "DRAFT" } }),
      ctx.db.move.count({ where: { companyId, moveType: "OUT_INVOICE", state: "POSTED", paymentState: { in: ["NOT_PAID", "PARTIAL"] } } }),
    ]);
    return { billToReceive, billedNotReceived, invoicesToBeIssued, invoicedNotDelivered };
  }),
});
