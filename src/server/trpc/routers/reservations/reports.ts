import { z } from "zod";

import { reportFilterSchema } from "@/lib/validations/reservations";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("reservations");

export const reportsRouter = createTRPCRouter({
  occupancy: proc
    .input(reportFilterSchema)
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        companyId: ctx.companyId,
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
      };
      if (input.hotelId) where.hotelId = input.hotelId;
      if (input.dateFrom) where.checkIn = { gte: new Date(input.dateFrom) };
      if (input.dateTo) {
        where.checkOut = { ...(where.checkOut as object ?? {}), lte: new Date(input.dateTo) };
      }

      const bookings = await ctx.db.booking.findMany({
        where,
        select: {
          hotelId: true,
          nights: true,
          hotel: { select: { id: true, name: true, totalRooms: true } },
          _count: { select: { rooms: true } },
        },
      });

      // Group by hotel
      const hotelStats = new Map<string, { name: string; totalRooms: number; roomNightsBooked: number }>();
      for (const b of bookings) {
        const existing = hotelStats.get(b.hotelId);
        const roomNights = b._count.rooms * b.nights;
        if (existing) {
          existing.roomNightsBooked += roomNights;
        } else {
          hotelStats.set(b.hotelId, {
            name: b.hotel.name,
            totalRooms: b.hotel.totalRooms ?? 0,
            roomNightsBooked: roomNights,
          });
        }
      }

      return Array.from(hotelStats.entries()).map(([hotelId, stats]) => ({
        hotelId,
        hotelName: stats.name,
        totalRooms: stats.totalRooms,
        roomNightsBooked: stats.roomNightsBooked,
      }));
    }),

  revenue: proc
    .input(reportFilterSchema)
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        companyId: ctx.companyId,
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
      };
      if (input.hotelId) where.hotelId = input.hotelId;
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.source) where.source = input.source;
      if (input.dateFrom) where.checkIn = { gte: new Date(input.dateFrom) };
      if (input.dateTo) {
        where.checkOut = { ...(where.checkOut as object ?? {}), lte: new Date(input.dateTo) };
      }

      const bookings = await ctx.db.booking.findMany({
        where,
        select: {
          hotelId: true,
          tourOperatorId: true,
          source: true,
          buyingTotal: true,
          sellingTotal: true,
          totalPaid: true,
          hotel: { select: { name: true } },
          tourOperator: { select: { name: true } },
        },
      });

      let totalBuying = 0;
      let totalSelling = 0;
      let totalPaid = 0;

      const byHotel = new Map<string, { name: string; buying: number; selling: number; count: number }>();
      const bySource = new Map<string, { buying: number; selling: number; count: number }>();

      for (const b of bookings) {
        const buying = Number(b.buyingTotal);
        const selling = Number(b.sellingTotal);
        totalBuying += buying;
        totalSelling += selling;
        totalPaid += Number(b.totalPaid);

        // By hotel
        const h = byHotel.get(b.hotelId);
        if (h) {
          h.buying += buying;
          h.selling += selling;
          h.count++;
        } else {
          byHotel.set(b.hotelId, { name: b.hotel.name, buying, selling, count: 1 });
        }

        // By source
        const s = bySource.get(b.source);
        if (s) {
          s.buying += buying;
          s.selling += selling;
          s.count++;
        } else {
          bySource.set(b.source, { buying, selling, count: 1 });
        }
      }

      return {
        totalBuying: Math.round(totalBuying * 100) / 100,
        totalSelling: Math.round(totalSelling * 100) / 100,
        totalMargin: Math.round((totalSelling - totalBuying) * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOutstanding: Math.round((totalSelling - totalPaid) * 100) / 100,
        bookingCount: bookings.length,
        byHotel: Array.from(byHotel.entries()).map(([id, v]) => ({ hotelId: id, ...v })),
        bySource: Array.from(bySource.entries()).map(([source, v]) => ({ source, ...v })),
      };
    }),

  upcomingArrivals: proc
    .input(z.object({ days: z.number().int().min(1).max(30).default(7) }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const future = new Date(now.getTime() + (input?.days ?? 7) * 86_400_000);

      return ctx.db.booking.findMany({
        where: {
          companyId: ctx.companyId,
          status: "CONFIRMED",
          checkIn: { gte: now, lte: future },
        },
        include: {
          hotel: { select: { id: true, name: true } },
          currency: { select: { code: true, symbol: true } },
          _count: { select: { rooms: true } },
        },
        orderBy: { checkIn: "asc" },
      });
    }),

  upcomingDepartures: proc
    .input(z.object({ days: z.number().int().min(1).max(30).default(7) }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const future = new Date(now.getTime() + (input?.days ?? 7) * 86_400_000);

      return ctx.db.booking.findMany({
        where: {
          companyId: ctx.companyId,
          status: "CHECKED_IN",
          checkOut: { gte: now, lte: future },
        },
        include: {
          hotel: { select: { id: true, name: true } },
          currency: { select: { code: true, symbol: true } },
        },
        orderBy: { checkOut: "asc" },
      });
    }),
});
