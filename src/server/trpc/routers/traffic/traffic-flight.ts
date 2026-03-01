import { z } from "zod";

import { trafficFlightCreateSchema, trafficFlightUpdateSchema } from "@/lib/validations/traffic";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const trafficFlightRouter = createTRPCRouter({
  list: proc
    .input(z.object({ flightDate: z.coerce.date().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.ttTrafficFlight.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.flightDate ? { flightDate: input.flightDate } : {}),
        },
        include: {
          arrAirport: { select: { id: true, code: true, name: true } },
          depAirport: { select: { id: true, code: true, name: true } },
          _count: { select: { jobs: true } },
        },
        orderBy: [{ flightDate: "desc" }, { flightNumber: "asc" }],
      });
    }),

  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ttTrafficFlight.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          arrAirport: { select: { id: true, code: true, name: true } },
          depAirport: { select: { id: true, code: true, name: true } },
          jobs: {
            include: {
              vehicleType: { select: { name: true } },
              partner: { select: { name: true } },
            },
          },
        },
      });
    }),

  create: proc
    .input(trafficFlightCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficFlight.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: proc
    .input(z.object({ id: z.string(), data: trafficFlightUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficFlight.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: input.data,
      });
    }),

  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.ttTrafficFlight.delete({
        where: { id: input.id, companyId: ctx.companyId },
      });
    }),
});
