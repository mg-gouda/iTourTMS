import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Decimal } from "decimal.js";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { opsQuotationCreateSchema, opsQuotationUpdateSchema } from "@/lib/validations/tour-ops";
import type { OpsQuotationStatus } from "@prisma/client";
import type { db as dbType } from "@/server/db";

const p = (code: string) => modulePermissionProcedure("tour-ops", code);

async function recalcQuotationTotals(
  db: typeof dbType,
  quotationId: string,
  packageMarkupType?: string | null,
  packageMarkupValue?: number | null
) {
  const quotation = await db.opsQuotation.findUnique({
    where: { id: quotationId },
    include: { package: { include: { components: true } } },
  });
  if (!quotation) return;

  const totalCost = quotation.package.components.reduce(
    (sum, c) => sum.plus(c.totalCost),
    new Decimal(0)
  );
  const componentSelling = quotation.package.components.reduce(
    (sum, c) => sum.plus(c.sellingPrice),
    new Decimal(0)
  );

  let totalSelling = componentSelling;
  if (packageMarkupType === "PERCENTAGE" && packageMarkupValue) {
    totalSelling = totalCost
      .times(new Decimal(1).plus(new Decimal(packageMarkupValue).div(100)))
      .toDecimalPlaces(2);
  } else if (packageMarkupType === "FIXED" && packageMarkupValue) {
    totalSelling = totalCost.plus(packageMarkupValue).toDecimalPlaces(2);
  }

  const margin = totalSelling.minus(totalCost).toDecimalPlaces(2);
  const marginPct =
    totalCost.isZero() ? new Decimal(0) : margin.div(totalCost).times(100).toDecimalPlaces(2);

  await db.opsQuotation.update({
    where: { id: quotationId },
    data: { totalCost: totalCost.toNumber(), totalSelling: totalSelling.toNumber(), margin: margin.toNumber(), marginPct: marginPct.toNumber() },
  });
}

export const opsQuotationRouter = createTRPCRouter({
  list: p("tour-ops:quotation:read")
    .input(
      z.object({
        fileId: z.string().optional(),
        status: z.string().optional(),
        clientType: z.string().optional(),
        page: z.number().int().default(1),
        pageSize: z.number().int().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { companyId: ctx.companyId };
      if (input.fileId) where.fileId = input.fileId;
      if (input.status) where.status = input.status;
      if (input.clientType) where.clientType = input.clientType;
      const [items, total] = await Promise.all([
        ctx.db.opsQuotation.findMany({
          where,
          include: {
            file: { select: { id: true, code: true, guestName: true, travelFrom: true, travelTo: true } },
            package: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.opsQuotation.count({ where }),
      ]);
      return { items, total };
    }),

  getById: p("tour-ops:quotation:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const quotation = await ctx.db.opsQuotation.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          file: true,
          package: {
            include: {
              components: {
                include: { supplier: { select: { id: true, name: true } } },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      });
      if (!quotation) throw new TRPCError({ code: "NOT_FOUND" });
      return quotation;
    }),

  create: p("tour-ops:quotation:create")
    .input(opsQuotationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { companyId, db } = ctx;
      const seq = await db.sequence.upsert({
        where: { companyId_code: { companyId, code: "ops_quotation" } },
        create: { companyId, code: "ops_quotation", prefix: "QT", separator: "-", padding: 5, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
      });
      const num = seq.nextNumber - 1;
      const code = `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;

      const quotation = await db.opsQuotation.create({
        data: {
          companyId,
          code,
          fileId: input.fileId,
          packageId: input.packageId,
          clientType: input.clientType,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          packageMarkupType: input.packageMarkupType ?? null,
          packageMarkupValue: input.packageMarkupValue ?? null,
          notes: input.notes || null,
          terms: input.terms || null,
        },
      });

      await recalcQuotationTotals(db, quotation.id, input.packageMarkupType, input.packageMarkupValue ?? null);
      await db.opsFile.update({ where: { id: input.fileId }, data: { status: "QUOTED" } });

      return db.opsQuotation.findUnique({ where: { id: quotation.id } });
    }),

  update: p("tour-ops:quotation:update")
    .input(z.object({ id: z.string(), data: opsQuotationUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.opsQuotation.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.isFinal) throw new TRPCError({ code: "FORBIDDEN", message: "This quotation is finalized and cannot be edited" });

      const updated = await ctx.db.opsQuotation.update({
        where: { id: input.id },
        data: {
          ...input.data,
          validUntil: input.data.validUntil ? new Date(input.data.validUntil) : undefined,
          packageMarkupType: input.data.packageMarkupType ?? undefined,
          packageMarkupValue: input.data.packageMarkupValue ?? undefined,
        },
      });
      await recalcQuotationTotals(ctx.db, input.id, updated.packageMarkupType, Number(updated.packageMarkupValue ?? 0));
      return ctx.db.opsQuotation.findUnique({ where: { id: input.id } });
    }),

  updateStatus: p("tour-ops:quotation:update")
    .input(z.object({ id: z.string(), status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]) }))
    .mutation(async ({ ctx, input }) => {
      const q = await ctx.db.opsQuotation.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      if (q.isFinal) throw new TRPCError({ code: "FORBIDDEN", message: "Finalized quotation status cannot be changed" });

      const allowed: Record<OpsQuotationStatus, OpsQuotationStatus[]> = {
        DRAFT: ["SENT", "EXPIRED"],
        SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
        ACCEPTED: ["EXPIRED"],
        REJECTED: ["DRAFT"],
        EXPIRED: ["DRAFT"],
      };
      if (!allowed[q.status]?.includes(input.status)) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Cannot transition from ${q.status} to ${input.status}` });
      }
      return ctx.db.opsQuotation.update({ where: { id: input.id }, data: { status: input.status } });
    }),

  finalize: p("tour-ops:quotation:manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const q = await ctx.db.opsQuotation.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      if (q.status !== "ACCEPTED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only accepted quotations can be finalized" });
      }
      return ctx.db.$transaction(async (tx) => {
        const finalized = await tx.opsQuotation.update({
          where: { id: input.id },
          data: { isFinal: true },
        });
        await tx.opsFile.update({
          where: { id: q.fileId },
          data: { status: "CONFIRMED" },
        });
        await tx.opsPnL.upsert({
          where: { fileId: q.fileId },
          create: {
            fileId: q.fileId,
            budgetedCost: q.totalCost,
            budgetedRevenue: q.totalSelling,
          },
          update: {
            budgetedCost: q.totalCost,
            budgetedRevenue: q.totalSelling,
          },
        });
        return finalized;
      });
    }),

  delete: p("tour-ops:quotation:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const q = await ctx.db.opsQuotation.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      if (q.isFinal) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete a finalized quotation" });
      return ctx.db.opsQuotation.delete({ where: { id: input.id } });
    }),
});
