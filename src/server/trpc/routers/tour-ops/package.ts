import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { opsPackageCreateSchema, opsPackageUpdateSchema } from "@/lib/validations/tour-ops";

const tourOpsProcedure = moduleProcedure("tour-ops");

export const opsPackageRouter = createTRPCRouter({
  list: tourOpsProcedure
    .input(z.object({ fileId: z.string().optional(), isTemplate: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsPackage.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.fileId ? { fileId: input.fileId } : {}),
          ...(input.isTemplate !== undefined ? { isTemplate: input.isTemplate } : {}),
        },
        include: {
          _count: { select: { components: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  listTemplates: tourOpsProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.opsPackage.findMany({
        where: {
          companyId: ctx.companyId,
          isTemplate: true,
          ...(input.search ? { name: { contains: input.search, mode: "insensitive" } } : {}),
        },
        include: {
          components: { orderBy: { sortOrder: "asc" } },
          _count: { select: { components: true } },
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pkg = await ctx.db.opsPackage.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          components: {
            include: { supplier: { select: { id: true, name: true } } },
            orderBy: { sortOrder: "asc" },
          },
          file: { select: { id: true, code: true, status: true } },
        },
      });
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });
      return pkg;
    }),

  create: tourOpsProcedure
    .input(opsPackageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.opsPackage.create({
        data: {
          companyId: ctx.companyId,
          name: input.name,
          description: input.description || null,
          fileId: input.fileId || null,
          isTemplate: input.isTemplate,
          baseCurrency: input.baseCurrency,
          notes: input.notes || null,
        },
      });
    }),

  update: tourOpsProcedure
    .input(z.object({ id: z.string(), data: opsPackageUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db.opsPackage.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsPackage.update({
        where: { id: input.id },
        data: {
          ...input.data,
          fileId: input.data.fileId === "" ? null : input.data.fileId,
        },
      });
    }),

  delete: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db.opsPackage.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.opsPackage.delete({ where: { id: input.id } });
    }),

  cloneFromTemplate: tourOpsProcedure
    .input(z.object({ templateId: z.string(), fileId: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.opsPackage.findFirst({
        where: { id: input.templateId, companyId: ctx.companyId, isTemplate: true },
        include: { components: true },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.$transaction(async (tx) => {
        const newPkg = await tx.opsPackage.create({
          data: {
            companyId: ctx.companyId,
            name: input.name ?? template.name,
            description: template.description,
            fileId: input.fileId,
            isTemplate: false,
            baseCurrency: template.baseCurrency,
            totalCost: template.totalCost,
            notes: template.notes,
          },
        });
        if (template.components.length > 0) {
          await tx.opsPackageComponent.createMany({
            data: template.components.map((c) => ({
              packageId: newPkg.id,
              type: c.type,
              description: c.description,
              supplierId: c.supplierId,
              serviceDate: c.serviceDate,
              qty: c.qty,
              unitCost: c.unitCost,
              currency: c.currency,
              exchangeRate: c.exchangeRate,
              totalCost: c.totalCost,
              markupType: c.markupType,
              markupValue: c.markupValue,
              sellingPrice: c.sellingPrice,
              notes: c.notes,
              sortOrder: c.sortOrder,
            })),
          });
        }
        return newPkg;
      });
    }),

  recalcTotalCost: tourOpsProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agg = await ctx.db.opsPackageComponent.aggregate({
        where: { packageId: input.id },
        _sum: { totalCost: true },
      });
      return ctx.db.opsPackage.update({
        where: { id: input.id },
        data: { totalCost: agg._sum.totalCost ?? 0 },
      });
    }),
});
