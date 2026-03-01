import { z } from "zod";

import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("traffic");

export const reportsRouter = createTRPCRouter({
  dailyDispatch: proc
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      return ctx.db.ttTrafficJob.findMany({
        where: {
          companyId: ctx.companyId,
          serviceDate: { gte: dayStart, lt: dayEnd },
        },
        include: {
          vehicleType: { select: { name: true } },
          pickupAirport: { select: { code: true } },
          pickupHotel: { select: { name: true } },
          dropoffAirport: { select: { code: true } },
          dropoffHotel: { select: { name: true } },
          partner: { select: { name: true } },
          flight: { select: { flightNumber: true, arrTime: true, depTime: true } },
          assignments: {
            include: {
              vehicle: { select: { plateNumber: true } },
              driver: { include: { user: { select: { name: true } } } },
              rep: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: [{ pickupTime: "asc" }],
      });
    }),

  jobStats: proc
    .input(z.object({
      dateFrom: z.coerce.date(),
      dateTo: z.coerce.date(),
    }))
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db.ttTrafficJob.groupBy({
        by: ["status"],
        where: {
          companyId: ctx.companyId,
          serviceDate: { gte: input.dateFrom, lte: input.dateTo },
        },
        _count: true,
      });

      const byServiceType = await ctx.db.ttTrafficJob.groupBy({
        by: ["serviceType"],
        where: {
          companyId: ctx.companyId,
          serviceDate: { gte: input.dateFrom, lte: input.dateTo },
        },
        _count: true,
      });

      return { byStatus: jobs, byServiceType };
    }),

  driverPerformance: proc
    .input(z.object({
      dateFrom: z.coerce.date(),
      dateTo: z.coerce.date(),
    }))
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.db.ttTrafficAssignment.findMany({
        where: {
          companyId: ctx.companyId,
          job: {
            serviceDate: { gte: input.dateFrom, lte: input.dateTo },
          },
          driverId: { not: null },
        },
        include: {
          driver: { include: { user: { select: { name: true } } } },
          job: { select: { status: true } },
        },
      });

      // Group by driver
      const driverMap = new Map<string, { name: string; total: number; completed: number; noShow: number }>();
      for (const a of assignments) {
        if (!a.driverId || !a.driver) continue;
        const key = a.driverId;
        const entry = driverMap.get(key) ?? { name: a.driver.user.name ?? "Unknown", total: 0, completed: 0, noShow: 0 };
        entry.total++;
        if (a.job.status === "COMPLETED") entry.completed++;
        if (a.job.status === "NO_SHOW") entry.noShow++;
        driverMap.set(key, entry);
      }

      return Array.from(driverMap.entries()).map(([id, data]) => ({ id, ...data }));
    }),

  revenueByService: proc
    .input(z.object({
      dateFrom: z.coerce.date(),
      dateTo: z.coerce.date(),
    }))
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db.ttTrafficJob.findMany({
        where: {
          companyId: ctx.companyId,
          serviceDate: { gte: input.dateFrom, lte: input.dateTo },
          status: { in: ["COMPLETED", "IN_PROGRESS"] },
        },
        select: {
          serviceType: true,
          price: true,
          cost: true,
        },
      });

      const map = new Map<string, { revenue: number; cost: number; count: number }>();
      for (const j of jobs) {
        const entry = map.get(j.serviceType) ?? { revenue: 0, cost: 0, count: 0 };
        entry.revenue += Number(j.price);
        entry.cost += Number(j.cost);
        entry.count++;
        map.set(j.serviceType, entry);
      }

      return Array.from(map.entries()).map(([serviceType, data]) => ({
        serviceType,
        ...data,
        margin: data.revenue - data.cost,
      }));
    }),
});
