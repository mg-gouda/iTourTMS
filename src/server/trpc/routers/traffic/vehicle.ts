import { z } from "zod";

import {
  vehicleCreateSchema,
  vehicleUpdateSchema,
  vehicleComplianceCreateSchema,
} from "@/lib/validations/traffic";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("traffic", code);

export const vehicleRouter = createTRPCRouter({
  list: p("traffic:vehicle:read").query(async ({ ctx }) => {
    return ctx.db.ttVehicle.findMany({
      where: { companyId: ctx.companyId },
      include: {
        vehicleType: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true } },
        _count: { select: { compliances: true, driverVehicles: true, assignments: true } },
      },
      orderBy: { plateNumber: "asc" },
    });
  }),

  getById: p("traffic:vehicle:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttVehicle.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          vehicleType: { select: { id: true, name: true, code: true } },
          supplier: { select: { id: true, name: true } },
          compliances: { orderBy: { expiryDate: "asc" } },
          driverVehicles: {
            include: {
              driver: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
        },
      });
    }),

  create: p("traffic:vehicle:create")
    .input(vehicleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.ttVehicle.findFirst({
        where: { companyId: ctx.companyId, plateNumber: input.plateNumber },
      });
      if (existing) {
        throw new Error(`A vehicle with plate "${input.plateNumber}" already exists.`);
      }
      return ctx.db.ttVehicle.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: p("traffic:vehicle:update")
    .input(z.object({ id: z.string(), data: vehicleUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttVehicle.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: p("traffic:vehicle:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttVehicle.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  addCompliance: p("traffic:vehicle:create")
    .input(vehicleComplianceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.ttVehicle.findFirstOrThrow({
        where: { id: input.vehicleId, companyId: ctx.companyId },
      });
      return ctx.db.ttVehicleCompliance.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  listCompliance: p("traffic:vehicle:read")
    .input(z.object({ vehicleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttVehicleCompliance.findMany({
        where: { vehicleId: input.vehicleId, companyId: ctx.companyId },
        orderBy: { expiryDate: "asc" },
      });
    }),

  deleteCompliance: p("traffic:vehicle:delete")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttVehicleCompliance.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
