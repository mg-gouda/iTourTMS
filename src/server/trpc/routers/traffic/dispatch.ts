import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const dispatchRouter = createTRPCRouter({
  getDailyDispatch: proc
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const jobs = await ctx.db.ttTrafficJob.findMany({
        where: {
          companyId: ctx.companyId,
          serviceDate: { gte: dayStart, lt: dayEnd },
        },
        include: {
          vehicleType: { select: { id: true, name: true, code: true } },
          pickupAirport: { select: { id: true, code: true, name: true } },
          pickupHotel: { select: { id: true, name: true } },
          dropoffAirport: { select: { id: true, code: true, name: true } },
          dropoffHotel: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true } },
          flight: { select: { id: true, flightNumber: true, arrTime: true, depTime: true } },
          assignments: {
            include: {
              vehicle: { select: { id: true, plateNumber: true } },
              driver: { include: { user: { select: { id: true, name: true } } } },
              rep: { include: { user: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: [{ pickupTime: "asc" }, { createdAt: "asc" }],
      });

      // Split by service type
      const arrivals = jobs.filter((j) => ["ARR", "ARR_DEP", "AIRPORT_MEET"].includes(j.serviceType));
      const departures = jobs.filter((j) => j.serviceType === "DEP");
      const others = jobs.filter((j) => !["ARR", "ARR_DEP", "AIRPORT_MEET", "DEP"].includes(j.serviceType));

      return { arrivals, departures, others, total: jobs.length };
    }),

  getAvailableVehicles: proc
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // Get vehicle IDs already assigned for this date
      const assignedVehicleIds = (
        await ctx.db.ttTrafficAssignment.findMany({
          where: {
            companyId: ctx.companyId,
            job: { serviceDate: { gte: dayStart, lt: dayEnd } },
            vehicleId: { not: null },
          },
          select: { vehicleId: true },
        })
      ).map((a) => a.vehicleId).filter(Boolean) as string[];

      return ctx.db.ttVehicle.findMany({
        where: {
          companyId: ctx.companyId,
          isActive: true,
          status: "ACTIVE",
          id: { notIn: assignedVehicleIds },
        },
        include: {
          vehicleType: { select: { id: true, name: true, capacity: true } },
        },
        orderBy: { plateNumber: "asc" },
      });
    }),

  getAvailableDrivers: proc
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const assignedDriverIds = (
        await ctx.db.ttTrafficAssignment.findMany({
          where: {
            companyId: ctx.companyId,
            job: { serviceDate: { gte: dayStart, lt: dayEnd } },
            driverId: { not: null },
          },
          select: { driverId: true },
        })
      ).map((a) => a.driverId).filter(Boolean) as string[];

      return ctx.db.ttDriver.findMany({
        where: {
          companyId: ctx.companyId,
          isActive: true,
          status: "ACTIVE",
          id: { notIn: assignedDriverIds },
        },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { user: { name: "asc" } },
      });
    }),

  getAvailableReps: proc
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const assignedRepIds = (
        await ctx.db.ttTrafficAssignment.findMany({
          where: {
            companyId: ctx.companyId,
            job: { serviceDate: { gte: dayStart, lt: dayEnd } },
            repId: { not: null },
          },
          select: { repId: true },
        })
      ).map((a) => a.repId).filter(Boolean) as string[];

      return ctx.db.ttRep.findMany({
        where: {
          companyId: ctx.companyId,
          isActive: true,
          id: { notIn: assignedRepIds },
        },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { user: { name: "asc" } },
      });
    }),

  bulkAssign: proc
    .input(z.object({
      assignments: z.array(z.object({
        jobId: z.string(),
        vehicleId: z.string().nullish(),
        driverId: z.string().nullish(),
        repId: z.string().nullish(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const item of input.assignments) {
        const assignment = await ctx.db.ttTrafficAssignment.create({
          data: {
            companyId: ctx.companyId,
            jobId: item.jobId,
            vehicleId: item.vehicleId,
            driverId: item.driverId,
            repId: item.repId,
          },
        });
        // Auto-update job status to ASSIGNED
        await ctx.db.ttTrafficJob.update({
          where: { id: item.jobId },
          data: { status: "ASSIGNED" },
        });
        results.push(assignment);
      }
      return results;
    }),

  lockDispatch: proc
    .input(z.object({ date: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      return ctx.db.ttTrafficJob.updateMany({
        where: {
          companyId: ctx.companyId,
          serviceDate: { gte: dayStart, lt: dayEnd },
          dispatchLockedAt: null,
        },
        data: { dispatchLockedAt: new Date() },
      });
    }),

  unlockDispatch: proc
    .input(z.object({ date: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      return ctx.db.ttTrafficJob.updateMany({
        where: {
          companyId: ctx.companyId,
          serviceDate: { gte: dayStart, lt: dayEnd },
        },
        data: { dispatchLockedAt: null },
      });
    }),
});
