import { z } from "zod";

import { driverCreateSchema, driverUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const driverRouter = createTRPCRouter({
  listCompanyUsers: proc.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }),

  list: proc.query(async ({ ctx }) => {
    return ctx.db.ttDriver.findMany({
      where: { companyId: ctx.companyId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { driverVehicles: true, assignments: true } },
      },
      orderBy: { user: { name: "asc" } },
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttDriver.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          driverVehicles: {
            include: {
              vehicle: {
                include: { vehicleType: { select: { id: true, name: true } } },
              },
            },
          },
          assignments: {
            take: 20,
            orderBy: { assignedAt: "desc" },
            include: {
              job: { select: { id: true, code: true, serviceDate: true, serviceType: true, status: true } },
            },
          },
        },
      });
    }),

  create: proc
    .input(driverCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.ttDriver.findFirst({
        where: { userId: input.userId },
      });
      if (existing) {
        throw new Error("This user is already registered as a driver.");
      }
      return ctx.db.ttDriver.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: driverUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttDriver.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttDriver.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),

  assignVehicle: proc
    .input(z.object({ driverId: z.string(), vehicleId: z.string(), isPrimary: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttDriverVehicle.create({
        data: {
          companyId: ctx.companyId,
          driverId: input.driverId,
          vehicleId: input.vehicleId,
          isPrimary: input.isPrimary,
        },
      });
    }),

  unassignVehicle: proc
    .input(z.object({ driverId: z.string(), vehicleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttDriverVehicle.delete({
        where: {
          driverId_vehicleId: {
            driverId: input.driverId,
            vehicleId: input.vehicleId,
          },
        },
      });
    }),
});
