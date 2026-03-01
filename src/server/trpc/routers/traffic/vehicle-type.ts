import { z } from "zod";

import { vehicleTypeCreateSchema, vehicleTypeUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const vehicleTypeRouter = createTRPCRouter({
  list: proc.query(async ({ ctx }) => {
    return ctx.db.ttVehicleType.findMany({
      where: { companyId: ctx.companyId },
      include: {
        _count: { select: { vehicles: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttVehicleType.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          _count: { select: { vehicles: true, priceItems: true } },
        },
      });
    }),

  create: proc
    .input(vehicleTypeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.ttVehicleType.findFirst({
        where: { companyId: ctx.companyId, code: input.code },
      });
      if (existing) {
        throw new Error(`A vehicle type with code "${input.code}" already exists.`);
      }
      return ctx.db.ttVehicleType.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: vehicleTypeUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttVehicleType.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vehicleCount = await ctx.db.ttVehicle.count({
        where: { vehicleTypeId: input.id, companyId: ctx.companyId },
      });
      if (vehicleCount > 0) {
        throw new Error("Cannot delete vehicle type with linked vehicles.");
      }
      return ctx.db.ttVehicleType.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
