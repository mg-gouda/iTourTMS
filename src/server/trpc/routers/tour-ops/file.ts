import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { opsFileCreateSchema, opsFileUpdateSchema } from "@/lib/validations/tour-ops";
import { OPS_FILE_STATUS_TRANSITIONS } from "@/lib/constants/tour-ops";
import type { OpsFileStatus } from "@prisma/client";
import { recalcCreditUsed } from "@/server/services/tour-ops/credit";

const p = (code: string) => modulePermissionProcedure("tour-ops", code);

export const opsFileRouter = createTRPCRouter({
  list: p("tour-ops:file:read")
    .input(
      z.object({
        status: z.string().optional(),
        clientType: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.number().int().default(1),
        pageSize: z.number().int().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { companyId, db } = ctx;
      const where: Record<string, unknown> = { companyId };
      if (input.status) where.status = input.status;
      if (input.clientType) where.clientType = input.clientType;
      if (input.dateFrom || input.dateTo) {
        where.travelFrom = {
          ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
          ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
        };
      }
      if (input.search) {
        where.OR = [
          { code: { contains: input.search, mode: "insensitive" } },
          { guestName: { contains: input.search, mode: "insensitive" } },
          { guestEmail: { contains: input.search, mode: "insensitive" } },
        ];
      }
      const [items, total] = await Promise.all([
        db.opsFile.findMany({
          where,
          include: {
            customer: { select: { id: true, firstName: true, lastName: true } },
            tourOperator: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            quotations: { select: { id: true, status: true, totalSelling: true }, orderBy: { createdAt: "desc" }, take: 1 },
            _count: { select: { packages: true, quotations: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        db.opsFile.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  getById: p("tour-ops:file:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.db.opsFile.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          customer: true,
          tourOperator: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true } },
          packages: {
            include: {
              components: { orderBy: { sortOrder: "asc" } },
              _count: { select: { components: true, quotations: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          quotations: {
            orderBy: { createdAt: "desc" },
            include: { package: { select: { id: true, name: true } } },
          },
          pnl: true,
        },
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });
      return file;
    }),

  create: p("tour-ops:file:create")
    .input(opsFileCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { companyId, db, session } = ctx;
      const seq = await db.sequence.upsert({
        where: { companyId_code: { companyId, code: "ops_file" } },
        create: { companyId, code: "ops_file", prefix: "FI", separator: "-", padding: 5, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
      });
      const num = seq.nextNumber - 1;
      const code = `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;

      const file = await db.opsFile.create({
        data: {
          companyId,
          code,
          clientType: input.clientType,
          customerId: input.customerId || null,
          tourOperatorId: input.tourOperatorId || null,
          guestName: input.guestName || null,
          guestEmail: input.guestEmail || null,
          guestPhone: input.guestPhone || null,
          travelFrom: new Date(input.travelFrom),
          travelTo: new Date(input.travelTo),
          adults: input.adults,
          children: input.children,
          infants: input.infants,
          notes: input.notes || null,
          createdById: session.user.id,
        },
      });

      await db.opsPnL.create({ data: { fileId: file.id } });

      return file;
    }),

  update: p("tour-ops:file:update")
    .input(z.object({ id: z.string(), data: opsFileUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.opsFile.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot edit a completed or cancelled file" });
      }
      return ctx.db.opsFile.update({
        where: { id: input.id },
        data: {
          ...input.data,
          travelFrom: input.data.travelFrom ? new Date(input.data.travelFrom) : undefined,
          travelTo: input.data.travelTo ? new Date(input.data.travelTo) : undefined,
          customerId: input.data.customerId === "" ? null : input.data.customerId,
          tourOperatorId: input.data.tourOperatorId === "" ? null : input.data.tourOperatorId,
        },
      });
    }),

  updateStatus: p("tour-ops:file:update")
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.opsFile.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });
      const allowed = OPS_FILE_STATUS_TRANSITIONS[file.status as OpsFileStatus] ?? [];
      if (!allowed.includes(input.status as OpsFileStatus)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot transition from ${file.status} to ${input.status}`,
        });
      }

      if (input.status === "COMPLETED") {
        const hasCollection = await ctx.db.payment.findFirst({
          where: {
            opsFileId: input.id,
            companyId: ctx.companyId,
            paymentType: "INBOUND",
            state: "POSTED",
          },
        });
        if (!hasCollection) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot complete file: a posted collection (inbound payment) linked to this file is required. Please record the client payment in Finance first.",
          });
        }
      }

      const updated = await ctx.db.opsFile.update({ where: { id: input.id }, data: { status: input.status as OpsFileStatus } });
      if ((input.status === "COMPLETED" || input.status === "CANCELLED") && file.tourOperatorId) {
        await recalcCreditUsed(ctx.db, ctx.companyId, file.tourOperatorId).catch(() => {});
      }
      return updated;
    }),

  delete: p("tour-ops:file:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.opsFile.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });
      if (file.status === "CONFIRMED" || file.status === "IN_PROGRESS" || file.status === "COMPLETED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete a confirmed, in-progress, or completed file" });
      }
      return ctx.db.opsFile.delete({ where: { id: input.id } });
    }),

  dashboard: p("tour-ops:file:read").query(async ({ ctx }) => {
    const { companyId, db } = ctx;
    const [statusCounts, revenueAgg, recentFiles] = await Promise.all([
      db.opsFile.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { _all: true },
      }),
      db.opsQuotation.aggregate({
        where: { companyId, status: "ACCEPTED", isFinal: true },
        _sum: { totalSelling: true, totalCost: true, margin: true },
      }),
      db.opsFile.findMany({
        where: { companyId },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          tourOperator: { select: { name: true } },
          quotations: { select: { totalSelling: true, status: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);
    return { statusCounts, revenueAgg, recentFiles };
  }),
});
