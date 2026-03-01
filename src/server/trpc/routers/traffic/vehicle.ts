import { z } from "zod";

import {
  vehicleCreateSchema,
  vehicleUpdateSchema,
  vehicleComplianceCreateSchema,
} from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const vehicleRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
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

  getById: proc
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

  create: proc
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

  update: proc
    .input(z.object({ id: z.string(), data: vehicleUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttVehicle.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttVehicle.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  addCompliance: proc
    .input(vehicleComplianceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.ttVehicle.findFirstOrThrow({
        where: { id: input.vehicleId, companyId: ctx.companyId },
      });
      return ctx.db.ttVehicleCompliance.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  listCompliance: proc
    .input(z.object({ vehicleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttVehicleCompliance.findMany({
        where: { vehicleId: input.vehicleId, companyId: ctx.companyId },
        orderBy: { expiryDate: "asc" },
      });
    }),

  deleteCompliance: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttVehicleCompliance.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
