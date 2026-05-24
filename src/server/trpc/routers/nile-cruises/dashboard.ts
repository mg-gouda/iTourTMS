import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseDashboardRouter = createTRPCRouter({
  kpis: p("nile-cruises:dashboard:read")
    .query(async ({ ctx }) => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const [
        totalBookingsThisMonth,
        confirmedBookings,
        totalRevenue,
        activeDepartures,
        totalPassengers,
        pendingRequests,
      ] = await Promise.all([
        ctx.db.cruiseBooking.count({
          where: {
            companyId: ctx.companyId,
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        ctx.db.cruiseBooking.count({
          where: {
            companyId: ctx.companyId,
            status: { in: ["CONFIRMED", "EMBARKED"] },
          },
        }),
        ctx.db.cruiseBooking.aggregate({
          where: {
            companyId: ctx.companyId,
            status: { in: ["CONFIRMED", "EMBARKED", "DISEMBARKED", "FINALIZED"] },
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { grossTotal: true },
        }),
        ctx.db.cruiseDeparture.count({
          where: {
            companyId: ctx.companyId,
            status: { in: ["OPEN_FOR_SALE", "EMBARKING", "SAILING"] },
            embarkDate: { gte: today },
          },
        }),
        ctx.db.cruisePassenger.count({
          where: { booking: { companyId: ctx.companyId } },
        }),
        ctx.db.cruiseSpecialRequest.count({
          where: {
            booking: { companyId: ctx.companyId },
            status: "PENDING",
          },
        }),
      ]);

      return {
        totalBookingsThisMonth,
        confirmedBookings,
        totalRevenue: Number(totalRevenue._sum?.grossTotal ?? 0),
        activeDepartures,
        totalPassengers,
        pendingRequests,
      };
    }),

  todayEmbarkations: p("nile-cruises:dashboard:read")
    .query(async ({ ctx }) => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 86400000);

      return ctx.db.cruiseDeparture.findMany({
        where: {
          companyId: ctx.companyId,
          embarkDate: { gte: todayStart, lt: todayEnd },
        },
        include: {
          boat: { select: { id: true, name: true } },
          cruiseType: { select: { id: true, name: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { embarkDate: "asc" },
      });
    }),

  upcomingDepartures: p("nile-cruises:dashboard:read")
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const today = new Date();
      const future = new Date(today.getTime() + (input?.days ?? 30) * 86400000);

      return ctx.db.cruiseDeparture.findMany({
        where: {
          companyId: ctx.companyId,
          embarkDate: { gte: today, lte: future },
          status: { in: ["OPEN_FOR_SALE", "CLOSED_FOR_SALE", "SCHEDULED"] },
        },
        include: {
          boat: { select: { id: true, name: true } },
          cruiseType: { select: { id: true, name: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { embarkDate: "asc" },
        take: 10,
      });
    }),

  recentBookings: p("nile-cruises:dashboard:read")
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.findMany({
        where: { companyId: ctx.companyId },
        include: {
          departure: {
            select: {
              id: true,
              code: true,
              embarkDate: true,
              boat: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 10,
      });
    }),

  occupancyTrend: p("nile-cruises:dashboard:read")
    .input(z.object({ months: z.number().int().min(1).max(12).default(6) }).optional())
    .query(async ({ ctx, input }) => {
      const months = input?.months ?? 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const departures = await ctx.db.cruiseDeparture.findMany({
        where: {
          companyId: ctx.companyId,
          embarkDate: { gte: startDate },
        },
        include: {
          _count: { select: { bookings: true } },
          boat: { select: { totalCabins: true } },
        },
      });

      const byMonth: Record<string, { bookings: number; capacity: number }> = {};
      for (const dep of departures) {
        const key = dep.embarkDate.toISOString().slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { bookings: 0, capacity: 0 };
        byMonth[key].bookings += dep._count.bookings;
        byMonth[key].capacity += dep.boat.totalCabins;
      }

      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          bookings: data.bookings,
          capacity: data.capacity,
          occupancyRate: data.capacity > 0 ? Math.round((data.bookings / data.capacity) * 100) : 0,
        }));
    }),

  salesByBoat: p("nile-cruises:dashboard:read")
    .query(async ({ ctx }) => {
      const boats = await ctx.db.cruiseBoat.findMany({
        where: { companyId: ctx.companyId },
        include: {
          _count: { select: { departures: true } },
        },
      });

      const revenueByBoat = await Promise.all(
        boats.map(async (boat) => {
          const agg = await ctx.db.cruiseBooking.aggregate({
            where: {
              companyId: ctx.companyId,
              departure: { boatId: boat.id },
              status: { in: ["CONFIRMED", "EMBARKED", "DISEMBARKED", "FINALIZED"] },
            },
            _sum: { grossTotal: true },
            _count: { id: true },
          });
          return {
            boatId: boat.id,
            boatName: boat.name,
            totalRevenue: Number(agg._sum?.grossTotal ?? 0),
            totalBookings: agg._count.id,
            totalDepartures: boat._count.departures,
          };
        })
      );

      return revenueByBoat;
    }),
});
