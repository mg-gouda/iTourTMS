import { differenceInYears } from "date-fns";
import { z } from "zod";

import {
  arrivalListFilterSchema,
  reportFilterSchema,
} from "@/lib/validations/reservations";
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
          currencyId: true,
          buyingTotal: true,
          sellingTotal: true,
          totalPaid: true,
          hotel: { select: { name: true } },
          tourOperator: { select: { name: true } },
          currency: { select: { code: true, symbol: true } },
        },
      });

      // Group totals by currency
      type CurrencyTotals = {
        currencyCode: string;
        currencySymbol: string;
        totalBuying: number;
        totalSelling: number;
        totalMargin: number;
        totalPaid: number;
        totalOutstanding: number;
        bookingCount: number;
      };
      const byCurrency = new Map<string, CurrencyTotals>();

      const byHotel = new Map<string, { name: string; currencyCode: string; buying: number; selling: number; count: number }>();
      const bySource = new Map<string, { count: number }>();
      const byTourOperator = new Map<string, { name: string; currencyCode: string; buying: number; selling: number; count: number }>();

      for (const b of bookings) {
        const buying = Number(b.buyingTotal);
        const selling = Number(b.sellingTotal);
        const paid = Number(b.totalPaid);

        // By currency
        const ct = byCurrency.get(b.currencyId);
        if (ct) {
          ct.totalBuying += buying;
          ct.totalSelling += selling;
          ct.totalPaid += paid;
          ct.bookingCount++;
        } else {
          byCurrency.set(b.currencyId, {
            currencyCode: b.currency.code,
            currencySymbol: b.currency.symbol,
            totalBuying: buying,
            totalSelling: selling,
            totalMargin: 0,
            totalPaid: paid,
            totalOutstanding: 0,
            bookingCount: 1,
          });
        }

        // By hotel (keyed by hotelId + currency to avoid mixing)
        const hotelKey = `${b.hotelId}::${b.currencyId}`;
        const h = byHotel.get(hotelKey);
        if (h) {
          h.buying += buying;
          h.selling += selling;
          h.count++;
        } else {
          byHotel.set(hotelKey, {
            name: b.hotel.name,
            currencyCode: b.currency.code,
            buying,
            selling,
            count: 1,
          });
        }

        // By source
        const s = bySource.get(b.source);
        if (s) {
          s.count++;
        } else {
          bySource.set(b.source, { count: 1 });
        }

        // By tour operator (keyed by toId + currency)
        if (b.tourOperatorId && b.tourOperator) {
          const toKey = `${b.tourOperatorId}::${b.currencyId}`;
          const t = byTourOperator.get(toKey);
          if (t) {
            t.buying += buying;
            t.selling += selling;
            t.count++;
          } else {
            byTourOperator.set(toKey, {
              name: b.tourOperator.name,
              currencyCode: b.currency.code,
              buying,
              selling,
              count: 1,
            });
          }
        }
      }

      // Finalize currency totals
      const currencies = Array.from(byCurrency.values()).map((ct) => {
        const r = (v: number) => Math.round(v * 100) / 100;
        return {
          ...ct,
          totalBuying: r(ct.totalBuying),
          totalSelling: r(ct.totalSelling),
          totalMargin: r(ct.totalSelling - ct.totalBuying),
          totalPaid: r(ct.totalPaid),
          totalOutstanding: r(ct.totalSelling - ct.totalPaid),
        };
      });

      return {
        currencies,
        bookingCount: bookings.length,
        byHotel: Array.from(byHotel.entries()).map(([key, v]) => ({
          hotelId: key.split("::")[0],
          ...v,
        })),
        bySource: Array.from(bySource.entries()).map(([source, v]) => ({ source, ...v })),
        byTourOperator: Array.from(byTourOperator.entries()).map(([key, v]) => ({
          tourOperatorId: key.split("::")[0],
          ...v,
        })),
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

  arrivalList: proc
    .input(arrivalListFilterSchema)
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hotelWhere: Record<string, any> = {};
      if (input.destinationId) hotelWhere.destinationId = input.destinationId;
      if (input.zoneId) hotelWhere.zoneId = input.zoneId;

      const bookings = await ctx.db.booking.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkIn: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
          ...(Object.keys(hotelWhere).length > 0
            ? { hotel: hotelWhere }
            : {}),
        },
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
              destination: { select: { id: true, name: true } },
              zone: { select: { id: true, name: true } },
            },
          },
          market: { select: { id: true, name: true } },
          rooms: {
            include: {
              roomType: { select: { name: true, code: true } },
              mealBasis: { select: { name: true, mealCode: true } },
            },
          },
        },
        orderBy: [
          { hotel: { name: "asc" } },
          { checkIn: "asc" },
        ],
      });

      // Flatten: one row per booking-room
      const rows = bookings.flatMap((b) => {
        const checkInDate = new Date(b.checkIn);
        // Compute child ages at check-in
        const child1Age = b.childDob1
          ? differenceInYears(checkInDate, new Date(b.childDob1))
          : null;
        const child2Age = b.childDob2
          ? differenceInYears(checkInDate, new Date(b.childDob2))
          : null;

        if (b.rooms.length === 0) {
          return [
            {
              bookingId: b.id,
              bookingCode: b.code,
              hotelId: b.hotel.id,
              hotelName: b.hotel.name,
              market: b.market?.name ?? "",
              roomType: "",
              mealBasis: "",
              guestName: b.leadGuestName ?? "",
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              nights: b.nights,
              noOfRooms: b.noOfRooms,
              adults: b.adults,
              children: b.children,
              infants: b.infants,
              child1Age,
              child2Age,
            },
          ];
        }

        return b.rooms.map((r) => ({
          bookingId: b.id,
          bookingCode: b.code,
          hotelId: b.hotel.id,
          hotelName: b.hotel.name,
          market: b.market?.name ?? "",
          roomType: r.roomType.name,
          mealBasis: r.mealBasis.mealCode,
          guestName: b.leadGuestName ?? "",
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          nights: b.nights,
          noOfRooms: 1,
          adults: r.adults,
          children: r.children,
          infants: r.infants,
          child1Age,
          child2Age,
        }));
      });

      // Compute summary totals
      const totalRoomNights = rows.reduce(
        (sum, r) => sum + r.noOfRooms * r.nights,
        0,
      );
      const totalRooms = rows.reduce((sum, r) => sum + r.noOfRooms, 0);
      const totalAdults = rows.reduce((sum, r) => sum + r.adults, 0);
      const totalChildren = rows.reduce((sum, r) => sum + r.children, 0);
      const totalInfants = rows.reduce((sum, r) => sum + r.infants, 0);

      return {
        rows,
        summary: {
          totalRoomNights,
          totalRooms,
          totalAdults,
          totalChildren,
          totalInfants,
        },
      };
    }),
});
