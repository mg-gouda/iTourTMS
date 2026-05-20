import { z } from "zod";

import { supplierTripPriceCreateSchema, supplierTripPriceUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("traffic", code);

export const supplierTripPriceRouter = createTRPCRouter({
  list: p("traffic:pricing:read")
    .input(z.object({ supplierId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.ttSupplierTripPrice.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.supplierId ? { supplierId: input.supplierId } : {}),
        },
        include: {
          supplier: { select: { id: true, name: true } },
          vehicleType: { select: { id: true, name: true, code: true } },
          currency: { select: { id: true, code: true, symbol: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: p("traffic:pricing:create")
    .input(supplierTripPriceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttSupplierTripPrice.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("traffic:pricing:update")
    .input(z.object({ id: z.string(), data: supplierTripPriceUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttSupplierTripPrice.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("traffic:pricing:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttSupplierTripPrice.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
