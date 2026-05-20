import { z } from "zod";

import { supplierCreateSchema, supplierUpdateSchema } from "@/lib/validations/crm";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("crm", code);

export const supplierRouter = createTRPCRouter({
  list: p("crm:supplier:read").query(async ({ ctx }) => {
    return ctx.db.crmSupplier.findMany({
      where: { companyId: ctx.companyId },
      include: {
        _count: { select: { costComponents: true } },
      },
      orderBy: { name: "asc" },
      take: 500,
    });
  }),

  getById: p("crm:supplier:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.crmSupplier.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          costComponents: {
            orderBy: { sortOrder: "asc" },
            include: {
              costSheet: {
                select: {
                  id: true,
                  name: true,
                  excursion: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
        },
      });
    }),

  create: p("crm:supplier:create")
    .input(supplierCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crmSupplier.create({
        data: {
          name: input.name,
          contactName: input.contactName || null,
          email: input.email || null,
          phone: input.phone || null,
          type: input.type || null,
          notes: input.notes || null,
          active: input.active,
          companyId: ctx.companyId,
        },
      });
    }),

  update: p("crm:supplier:update")
    .input(z.object({ id: z.string(), data: supplierUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.contactName !== undefined) data.contactName = data.contactName || null;
      if (data.email !== undefined) data.email = data.email || null;
      if (data.phone !== undefined) data.phone = data.phone || null;
      if (data.type !== undefined) data.type = data.type || null;
      if (data.notes !== undefined) data.notes = data.notes || null;

      return ctx.db.crmSupplier.update({
        where: { id: input.id, companyId: ctx.companyId },
        data,
      });
    }),

  delete: p("crm:supplier:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const componentCount = await ctx.db.crmCostComponent.count({
        where: { supplierId: input.id },
      });
      if (componentCount > 0) {
        throw new Error("Cannot delete supplier linked to cost components. Remove references first.");
      }
      return ctx.db.crmSupplier.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
