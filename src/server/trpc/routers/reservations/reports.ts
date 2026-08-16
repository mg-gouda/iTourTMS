import { differenceInYears } from "date-fns";
import { z } from "zod";

import {
  arrivalListFilterSchema,
  ebdListFilterSchema,
  materializationFilterSchema,
  paymentOptionDateFilterSchema,
  profitAndLossFilterSchema,
  rebookingGainsFilterSchema,
  reportFilterSchema,
} from "@/lib/validations/reservations";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("reservations", code);

/** Bucket key + label for a date, e.g. 2026-03 / "Mar 2026". */
function bucketOf(date: Date, bucket: "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR") {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  switch (bucket) {
    case "DAY": {
      const key = date.toISOString().slice(0, 10);
      return { key, label: key };
    }
    case "WEEK": {
      // ISO week — Monday start
      const d = new Date(Date.UTC(y, m, date.getUTCDate()));
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() - day + 1);
      const key = d.toISOString().slice(0, 10);
      return { key, label: `Week of ${key}` };
    }
    case "QUARTER": {
      const q = Math.floor(m / 3) + 1;
      return { key: `${y}-Q${q}`, label: `Q${q} ${y}` };
    }
    case "YEAR":
      return { key: String(y), label: String(y) };
    case "MONTH":
    default:
      return { key: `${y}-${String(m + 1).padStart(2, "0")}`, label: `${MONTHS[m]} ${y}` };
  }
}

export const reportsRouter = createTRPCRouter({
  occupancy: p("report.read")
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

  revenue: p("report.read")
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

  upcomingArrivals: p("report.read")
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

  upcomingDepartures: p("report.read")
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

  arrivalList: p("report.read")
    .input(arrivalListFilterSchema)
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hotelWhere: Record<string, any> = {};
      if (input.destinationId) hotelWhere.destinationId = input.destinationId;
      if (input.zoneId) hotelWhere.zoneId = input.zoneId;
      if (input.cityId) hotelWhere.cityId = input.cityId;

      const bookings = await ctx.db.booking.findMany({
        where: {
          companyId: ctx.companyId,
          status: input.status
            ? input.status
            : { in: ["CONFIRMED", "CHECKED_IN"] },
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

  // ── EBD list — bookings carrying an early booking discount ──
  ebdList: p("report.read")
    .input(ebdListFilterSchema)
    .query(async ({ ctx, input }) => {
      const from = new Date(input.dateFrom);
      const to = new Date(input.dateTo);

      const where: Record<string, unknown> = {
        companyId: ctx.companyId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        ebdPercent: { gt: 0 },
      };
      if (input.hotelId) where.hotelId = input.hotelId;
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.dateBasis === "EBD_PAYMENT") {
        where.ebdPaymentDate = { gte: from, lte: to };
      } else {
        where.checkIn = { gte: from, lte: to };
      }

      const bookings = await ctx.db.booking.findMany({
        where,
        select: {
          id: true,
          code: true,
          externalRef: true,
          checkIn: true,
          checkOut: true,
          ebdPercent: true,
          ebdPaymentDate: true,
          buyingTotal: true,
          hotel: { select: { name: true } },
          tourOperator: { select: { name: true } },
          currency: { select: { code: true, symbol: true } },
          currencyLines: {
            select: {
              buyingTotal: true,
              currency: { select: { code: true, symbol: true } },
            },
          },
        },
        orderBy: [{ ebdPaymentDate: "asc" }, { checkIn: "asc" }],
      });

      const totalsByCurrency = new Map<string, { code: string; symbol: string; ebdAmount: number }>();
      const today = new Date();

      const rows = bookings.map((b) => {
        const pct = Number(b.ebdPercent);

        // One EBD amount per currency the booking carries; fall back to the
        // booking currency when no lines exist yet.
        const lines = b.currencyLines.length
          ? b.currencyLines.map((l) => ({
              currencyCode: l.currency.code,
              currencySymbol: l.currency.symbol,
              buyingTotal: Number(l.buyingTotal),
              ebdAmount: Number(l.buyingTotal) * pct,
            }))
          : [
              {
                currencyCode: b.currency.code,
                currencySymbol: b.currency.symbol,
                buyingTotal: Number(b.buyingTotal),
                ebdAmount: Number(b.buyingTotal) * pct,
              },
            ];

        for (const l of lines) {
          const t = totalsByCurrency.get(l.currencyCode);
          if (t) t.ebdAmount += l.ebdAmount;
          else
            totalsByCurrency.set(l.currencyCode, {
              code: l.currencyCode,
              symbol: l.currencySymbol,
              ebdAmount: l.ebdAmount,
            });
        }

        const daysToPayment = b.ebdPaymentDate
          ? Math.ceil((b.ebdPaymentDate.getTime() - today.getTime()) / 86_400_000)
          : null;

        return {
          bookingId: b.id,
          bookingCode: b.code,
          externalRef: b.externalRef ?? "",
          hotelName: b.hotel.name,
          tourOperatorName: b.tourOperator?.name ?? "",
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          ebdPercent: pct,
          ebdPaymentDate: b.ebdPaymentDate,
          daysToPayment,
          overdue: daysToPayment !== null && daysToPayment < 0,
          lines,
        };
      });

      return {
        rows,
        totals: [...totalsByCurrency.values()].sort((a, b) => a.code.localeCompare(b.code)),
        bookingCount: rows.length,
      };
    }),

  // ── Rebooking gains — what re-securing rates saved, per currency ──
  rebookingGains: p("report.read")
    .input(rebookingGainsFilterSchema)
    .query(async ({ ctx, input }) => {
      const changes = await ctx.db.bookingRateChange.findMany({
        where: {
          changedAt: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
          booking: {
            companyId: ctx.companyId,
            ...(input.hotelId ? { hotelId: input.hotelId } : {}),
            ...(input.tourOperatorId ? { tourOperatorId: input.tourOperatorId } : {}),
          },
        },
        include: {
          changedBy: { select: { name: true } },
          booking: {
            select: {
              id: true,
              code: true,
              checkIn: true,
              hotel: { select: { name: true } },
              tourOperator: { select: { name: true } },
              currency: { select: { code: true, symbol: true } },
            },
          },
        },
        orderBy: { changedAt: "desc" },
      });

      // Only reductions count as a gain — matching ResLite
      const gainsByCurrency = new Map<string, { code: string; gain: number }>();
      const bookingsWithGain = new Set<string>();

      const rows = changes.map((c) => {
        // The base currency always comes from the change's own columns, so its
        // gain counts even for bookings that had no currency lines at the time.
        const snapshot = (c.lines as { currencyCode: string; oldBuying: number; newBuying: number }[] | null) ?? [];
        const baseCode = c.booking.currency.code;
        const perCurrency = [
          {
            currencyCode: baseCode,
            oldBuying: Number(c.oldBuyingTotal),
            newBuying: Number(c.newBuyingTotal),
          },
          ...snapshot.filter((l) => l.currencyCode !== baseCode),
        ].map((l) => ({ ...l, gain: l.oldBuying - l.newBuying }));

        for (const l of perCurrency) {
          if (l.gain <= 0) continue;
          bookingsWithGain.add(c.bookingId);
          const t = gainsByCurrency.get(l.currencyCode);
          if (t) t.gain += l.gain;
          else gainsByCurrency.set(l.currencyCode, { code: l.currencyCode, gain: l.gain });
        }

        return {
          id: c.id,
          bookingId: c.bookingId,
          bookingCode: c.booking.code,
          hotelName: c.booking.hotel.name,
          tourOperatorName: c.booking.tourOperator?.name ?? "",
          checkIn: c.booking.checkIn,
          changedAt: c.changedAt,
          changedBy: c.changedBy?.name ?? "",
          reason: c.reason ?? "",
          rebookedGuest: c.rebookedGuest ?? "",
          perCurrency,
        };
      });

      return {
        rows,
        totals: [...gainsByCurrency.values()].sort((a, b) => a.code.localeCompare(b.code)),
        changeCount: rows.length,
        bookingsWithGain: bookingsWithGain.size,
      };
    }),

  // ── P&L by period, optionally broken down by a dimension ──
  profitAndLoss: p("report.read")
    .input(profitAndLossFilterSchema)
    .query(async ({ ctx, input }) => {
      const from = new Date(input.dateFrom);
      const to = new Date(input.dateTo);

      const where: Record<string, unknown> = {
        companyId: ctx.companyId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      };
      if (input.hotelId) where.hotelId = input.hotelId;
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.marketId) where.marketId = input.marketId;
      if (input.dateBasis === "BOOKING_DATE") {
        where.OR = [
          { bookingDate: { gte: from, lte: to } },
          { bookingDate: null, createdAt: { gte: from, lte: to } },
        ];
      } else {
        where.checkIn = { gte: from, lte: to };
      }

      const bookings = await ctx.db.booking.findMany({
        where,
        select: {
          id: true,
          checkIn: true,
          bookingDate: true,
          createdAt: true,
          nights: true,
          source: true,
          buyingTotal: true,
          sellingTotal: true,
          currency: { select: { code: true, symbol: true } },
          hotel: { select: { name: true } },
          market: { select: { name: true } },
          tourOperator: { select: { name: true } },
          _count: { select: { rooms: true } },
          currencyLines: {
            select: {
              buyingTotal: true,
              sellingTotal: true,
              visaHandling: true,
              currency: { select: { code: true, symbol: true } },
            },
          },
        },
      });

      type Amounts = {
        currencyCode: string;
        currencySymbol: string;
        buying: number;
        selling: number;
        visaHandling: number;
      };
      type Cell = {
        key: string;
        label: string;
        group: string;
        bookings: number;
        roomNights: number;
        amounts: Map<string, Amounts>;
      };

      const cells = new Map<string, Cell>();
      const bucketOrder = new Map<string, string>();

      function addAmount(target: Map<string, Amounts>, a: Amounts) {
        const cur = target.get(a.currencyCode);
        if (cur) {
          cur.buying += a.buying;
          cur.selling += a.selling;
          cur.visaHandling += a.visaHandling;
        } else {
          target.set(a.currencyCode, { ...a });
        }
      }

      for (const b of bookings) {
        const basisDate =
          input.dateBasis === "BOOKING_DATE" ? (b.bookingDate ?? b.createdAt) : b.checkIn;
        const { key: bKey, label } = bucketOf(basisDate, input.bucket);
        bucketOrder.set(bKey, label);

        const group =
          input.groupBy === "TOUR_OPERATOR"
            ? (b.tourOperator?.name ?? "Direct")
            : input.groupBy === "MARKET"
              ? (b.market?.name ?? "Unassigned")
              : input.groupBy === "HOTEL"
                ? b.hotel.name
                : input.groupBy === "SOURCE"
                  ? b.source
                  : "All";

        const cellKey = `${bKey}::${group}`;
        let cell = cells.get(cellKey);
        if (!cell) {
          cell = { key: bKey, label, group, bookings: 0, roomNights: 0, amounts: new Map() };
          cells.set(cellKey, cell);
        }

        cell.bookings += 1;
        cell.roomNights += b.nights * b._count.rooms;

        const amounts: Amounts[] = b.currencyLines.length
          ? b.currencyLines.map((l) => ({
              currencyCode: l.currency.code,
              currencySymbol: l.currency.symbol,
              buying: Number(l.buyingTotal),
              selling: Number(l.sellingTotal),
              visaHandling: Number(l.visaHandling),
            }))
          : [
              {
                currencyCode: b.currency.code,
                currencySymbol: b.currency.symbol,
                buying: Number(b.buyingTotal),
                selling: Number(b.sellingTotal),
                visaHandling: 0,
              },
            ];
        for (const a of amounts) addAmount(cell.amounts, a);
      }

      // Shape for the client: profit derived, never stored
      const finish = (a: Amounts) => {
        const profit = a.selling - a.buying + a.visaHandling;
        return {
          currencyCode: a.currencyCode,
          currencySymbol: a.currencySymbol,
          buying: a.buying,
          selling: a.selling,
          visaHandling: a.visaHandling,
          profit,
          margin: a.selling > 0 ? (profit / a.selling) * 100 : 0,
        };
      };

      const rows = [...cells.values()]
        .map((c) => ({
          bucketKey: c.key,
          bucketLabel: c.label,
          group: c.group,
          bookings: c.bookings,
          roomNights: c.roomNights,
          amounts: [...c.amounts.values()].map(finish).sort((x, y) => x.currencyCode.localeCompare(y.currencyCode)),
        }))
        .sort((a, b) => a.bucketKey.localeCompare(b.bucketKey) || a.group.localeCompare(b.group));

      // Grand totals per currency
      const grand = new Map<string, Amounts>();
      for (const cell of cells.values()) {
        for (const a of cell.amounts.values()) addAmount(grand, a);
      }

      return {
        rows,
        buckets: [...bucketOrder.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, label]) => ({ key, label })),
        totals: [...grand.values()].map(finish).sort((a, b) => a.currencyCode.localeCompare(b.currencyCode)),
        bookingCount: bookings.length,
      };
    }),

  paymentOptionDate: p("report.read")
    .input(paymentOptionDateFilterSchema)
    .query(async ({ ctx, input }) => {
      const bookings = await ctx.db.booking.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
          checkIn: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
        },
        select: {
          id: true,
          code: true,
          externalRef: true,
          checkIn: true,
          checkOut: true,
          buyingTotal: true,
          currencyId: true,
          paymentOptionDate: true,
          hotel: { select: { name: true } },
          currency: { select: { code: true, symbol: true } },
        },
        orderBy: [{ hotel: { name: "asc" } }, { checkIn: "asc" }],
      });

      // Build rows and group totals by currency
      const totalsByCurrency = new Map<
        string,
        { code: string; symbol: string; total: number }
      >();

      const rows = bookings.map((b) => {
        const cost = Number(b.buyingTotal);
        const ct = totalsByCurrency.get(b.currencyId);
        if (ct) {
          ct.total += cost;
        } else {
          totalsByCurrency.set(b.currencyId, {
            code: b.currency.code,
            symbol: b.currency.symbol,
            total: cost,
          });
        }

        return {
          bookingId: b.id,
          bookingCode: b.code,
          externalRef: b.externalRef ?? "",
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          hotelName: b.hotel.name,
          cost,
          currencyCode: b.currency.code,
          currencySymbol: b.currency.symbol,
          paymentOptionDate: b.paymentOptionDate,
        };
      });

      const r = (v: number) => Math.round(v * 100) / 100;
      const currencyTotals = Array.from(totalsByCurrency.values()).map(
        (ct) => ({ ...ct, total: r(ct.total) }),
      );

      return { rows, currencyTotals };
    }),

  materialization: p("report.read")
    .input(materializationFilterSchema)
    .query(async ({ ctx, input }) => {
      const hotelId = input.hotelId;
      const dateFrom = new Date(input.dateFrom);
      const dateTo = new Date(input.dateTo);

      // 1. Find all contracts for this hotel belonging to the company
      const contracts = await ctx.db.contract.findMany({
        where: { companyId: ctx.companyId, hotelId },
        select: { id: true },
      });
      const contractIds = contracts.map((c) => c.id);

      // 2. Fetch allotments, stop sales, bookings, and room types in parallel
      const [allotments, stopSales, bookings, roomTypes] = await Promise.all([
        contractIds.length > 0
          ? ctx.db.contractAllotment.findMany({
              where: { contractId: { in: contractIds } },
              select: { roomTypeId: true, totalRooms: true },
            })
          : Promise.resolve([]),
        contractIds.length > 0
          ? ctx.db.contractStopSale.findMany({
              where: {
                contractId: { in: contractIds },
                dateFrom: { lte: dateTo },
                dateTo: { gte: dateFrom },
              },
              select: { roomTypeId: true, dateFrom: true, dateTo: true },
            })
          : Promise.resolve([]),
        ctx.db.booking.findMany({
          where: {
            companyId: ctx.companyId,
            hotelId,
            status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            checkIn: { lte: dateTo },
            checkOut: { gt: dateFrom },
          },
          select: {
            checkIn: true,
            checkOut: true,
            rooms: { select: { roomTypeId: true } },
          },
        }),
        ctx.db.hotelRoomType.findMany({
          where: { hotelId, active: true },
          select: { id: true, name: true },
          orderBy: { sortOrder: "asc" },
        }),
      ]);

      // 3. Sum allotments by roomTypeId
      const allocByRoom = new Map<string, number>();
      for (const a of allotments) {
        allocByRoom.set(
          a.roomTypeId,
          (allocByRoom.get(a.roomTypeId) ?? 0) + a.totalRooms,
        );
      }

      // 4. Build date array
      const dates: string[] = [];
      const cur = new Date(dateFrom);
      while (cur <= dateTo) {
        dates.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
      const numDays = dates.length;

      // 5. Pre-compute sold rooms per roomType per day-index
      const soldMap = new Map<string, number[]>(); // key: roomTypeId
      for (const b of bookings) {
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);
        for (const room of b.rooms) {
          if (!soldMap.has(room.roomTypeId)) {
            soldMap.set(room.roomTypeId, new Array(numDays).fill(0));
          }
          const arr = soldMap.get(room.roomTypeId)!;
          for (let i = 0; i < numDays; i++) {
            const day = new Date(dates[i]);
            if (day >= bIn && day < bOut) {
              arr[i]++;
            }
          }
        }
      }

      // 6. Pre-compute stop-sale counts per roomType per day-index
      const ssMap = new Map<string, number[]>(); // key: roomTypeId
      for (const ss of stopSales) {
        const ssFrom = new Date(ss.dateFrom);
        const ssTo = new Date(ss.dateTo);
        // Applies to specific room type or all room types
        const targetRoomIds = ss.roomTypeId
          ? [ss.roomTypeId]
          : roomTypes.map((rt) => rt.id);
        for (const rtId of targetRoomIds) {
          if (!ssMap.has(rtId)) {
            ssMap.set(rtId, new Array(numDays).fill(0));
          }
          const arr = ssMap.get(rtId)!;
          for (let i = 0; i < numDays; i++) {
            const day = new Date(dates[i]);
            if (day >= ssFrom && day <= ssTo) {
              arr[i]++;
            }
          }
        }
      }

      // 7. Build per-room-type results
      const roomTypeResults = roomTypes.map((rt) => {
        const alloc = allocByRoom.get(rt.id) ?? 0;
        const soldArr = soldMap.get(rt.id) ?? new Array(numDays).fill(0);
        const ssArr = ssMap.get(rt.id) ?? new Array(numDays).fill(0);

        const days = [];
        let ttlSold = 0;
        for (let i = 0; i < numDays; i++) {
          const sold = soldArr[i];
          const ss = ssArr[i];
          ttlSold += sold;
          days.push({
            alloc,
            sold,
            ss,
            avail: alloc - sold,
          });
        }

        const ttlAllot = alloc * numDays;
        const matPct = ttlAllot > 0 ? Math.round((ttlSold / ttlAllot) * 10000) / 100 : 0;

        return {
          id: rt.id,
          name: rt.name,
          ttlAllot,
          ttlSold,
          matPct,
          days,
        };
      });

      // 8. Hotel total row
      const hotelTotalDays = [];
      let hotelTtlAllot = 0;
      let hotelTtlSold = 0;
      for (let i = 0; i < numDays; i++) {
        let dayAlloc = 0;
        let daySold = 0;
        for (const rt of roomTypeResults) {
          dayAlloc += rt.days[i].alloc;
          daySold += rt.days[i].sold;
        }
        hotelTotalDays.push({
          alloc: dayAlloc,
          sold: daySold,
          avail: dayAlloc - daySold,
        });
        hotelTtlAllot += dayAlloc;
        hotelTtlSold += daySold;
      }
      const hotelMatPct =
        hotelTtlAllot > 0
          ? Math.round((hotelTtlSold / hotelTtlAllot) * 10000) / 100
          : 0;

      return {
        dates,
        roomTypes: roomTypeResults,
        hotelTotal: {
          ttlAllot: hotelTtlAllot,
          ttlSold: hotelTtlSold,
          matPct: hotelMatPct,
          days: hotelTotalDays,
        },
      };
    }),

  dailyOps: p("report.read").query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const baseWhere = { companyId: ctx.companyId };

    const [
      arrivalsToday,
      departuresToday,
      inHouseCount,
      newBookingsToday,
      cancellationsToday,
    ] = await Promise.all([
      ctx.db.booking.count({
        where: {
          ...baseWhere,
          status: "CONFIRMED",
          checkIn: { gte: todayStart, lt: todayEnd },
        },
      }),
      ctx.db.booking.count({
        where: {
          ...baseWhere,
          status: "CHECKED_IN",
          checkOut: { gte: todayStart, lt: todayEnd },
        },
      }),
      ctx.db.booking.count({
        where: {
          ...baseWhere,
          status: "CHECKED_IN",
          checkIn: { lte: todayStart },
          checkOut: { gt: todayStart },
        },
      }),
      ctx.db.booking.count({
        where: {
          ...baseWhere,
          createdAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      ctx.db.booking.count({
        where: {
          ...baseWhere,
          status: "CANCELLED",
          cancelledAt: { gte: todayStart, lt: todayEnd },
        },
      }),
    ]);

    return {
      arrivalsToday,
      departuresToday,
      inHouseCount,
      newBookingsToday,
      cancellationsToday,
    };
  }),

  productionByTO: p("report.read")
    .input(reportFilterSchema)
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        companyId: ctx.companyId,
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        tourOperatorId: { not: null },
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
        take: 1000,
        select: {
          tourOperatorId: true,
          nights: true,
          buyingTotal: true,
          sellingTotal: true,
          currencyId: true,
          tourOperator: { select: { name: true } },
          currency: { select: { code: true } },
          _count: { select: { rooms: true } },
        },
      });

      const r = (v: number) => Math.round(v * 100) / 100;

      const map = new Map<
        string,
        {
          tourOperatorId: string;
          name: string;
          bookingCount: number;
          roomNights: number;
          totalBuying: number;
          totalSelling: number;
          margin: number;
          currencyCode: string;
        }
      >();

      for (const b of bookings) {
        const key = `${b.tourOperatorId}::${b.currencyId}`;
        const buying = Number(b.buyingTotal);
        const selling = Number(b.sellingTotal);
        const roomNights = b._count.rooms * b.nights;
        const existing = map.get(key);
        if (existing) {
          existing.bookingCount++;
          existing.roomNights += roomNights;
          existing.totalBuying += buying;
          existing.totalSelling += selling;
          existing.margin += selling - buying;
        } else {
          map.set(key, {
            tourOperatorId: b.tourOperatorId!,
            name: b.tourOperator?.name ?? "",
            bookingCount: 1,
            roomNights,
            totalBuying: buying,
            totalSelling: selling,
            margin: selling - buying,
            currencyCode: b.currency.code,
          });
        }
      }

      return Array.from(map.values()).map((v) => ({
        ...v,
        totalBuying: r(v.totalBuying),
        totalSelling: r(v.totalSelling),
        margin: r(v.margin),
      }));
    }),

  cancellationReport: p("report.read")
    .input(reportFilterSchema)
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        companyId: ctx.companyId,
        status: "CANCELLED",
      };
      if (input.hotelId) where.hotelId = input.hotelId;
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.dateFrom) where.checkIn = { gte: new Date(input.dateFrom) };
      if (input.dateTo) {
        where.checkOut = { ...(where.checkOut as object ?? {}), lte: new Date(input.dateTo) };
      }

      const bookings = await ctx.db.booking.findMany({
        where,
        take: 1000,
        select: {
          id: true,
          code: true,
          cancelledAt: true,
          cancellationReason: true,
          sellingTotal: true,
          leadGuestName: true,
          hotel: { select: { name: true } },
          currency: { select: { code: true } },
        },
        orderBy: { cancelledAt: "desc" },
      });

      const r = (v: number) => Math.round(v * 100) / 100;

      return bookings.map((b) => ({
        bookingId: b.id,
        code: b.code,
        hotelName: b.hotel.name,
        guestName: b.leadGuestName ?? "",
        cancelledAt: b.cancelledAt,
        cancellationReason: b.cancellationReason ?? "",
        sellingTotal: r(Number(b.sellingTotal)),
        currencyCode: b.currency.code,
      }));
    }),

  noShowReport: p("report.read")
    .input(reportFilterSchema)
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        companyId: ctx.companyId,
        status: "NO_SHOW",
      };
      if (input.hotelId) where.hotelId = input.hotelId;
      if (input.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input.dateFrom) where.checkIn = { gte: new Date(input.dateFrom) };
      if (input.dateTo) {
        where.checkOut = { ...(where.checkOut as object ?? {}), lte: new Date(input.dateTo) };
      }

      const bookings = await ctx.db.booking.findMany({
        where,
        take: 1000,
        select: {
          id: true,
          code: true,
          checkIn: true,
          checkOut: true,
          sellingTotal: true,
          leadGuestName: true,
          hotel: { select: { name: true } },
          currency: { select: { code: true } },
        },
        orderBy: { checkIn: "desc" },
      });

      const r = (v: number) => Math.round(v * 100) / 100;

      return bookings.map((b) => ({
        bookingId: b.id,
        code: b.code,
        hotelName: b.hotel.name,
        guestName: b.leadGuestName ?? "",
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        sellingTotal: r(Number(b.sellingTotal)),
        currencyCode: b.currency.code,
      }));
    }),

  bookingLeadTime: p("report.read")
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
        take: 1000,
        select: {
          createdAt: true,
          checkIn: true,
          hotelId: true,
          hotel: { select: { name: true } },
        },
      });

      const r = (v: number) => Math.round(v * 100) / 100;

      // Global average
      let totalLeadDays = 0;
      for (const b of bookings) {
        const diff = (new Date(b.checkIn).getTime() - new Date(b.createdAt).getTime()) / 86_400_000;
        totalLeadDays += diff;
      }
      const averageLeadDays = bookings.length > 0 ? r(totalLeadDays / bookings.length) : 0;

      // By hotel
      const hotelMap = new Map<string, { name: string; totalLead: number; count: number }>();
      for (const b of bookings) {
        const diff = (new Date(b.checkIn).getTime() - new Date(b.createdAt).getTime()) / 86_400_000;
        const existing = hotelMap.get(b.hotelId);
        if (existing) {
          existing.totalLead += diff;
          existing.count++;
        } else {
          hotelMap.set(b.hotelId, { name: b.hotel.name, totalLead: diff, count: 1 });
        }
      }

      const byHotel = Array.from(hotelMap.values()).map((h) => ({
        hotelName: h.name,
        avgLeadDays: r(h.totalLead / h.count),
        bookingCount: h.count,
      }));

      return { averageLeadDays, byHotel };
    }),

  marketMix: p("report.read")
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
        take: 1000,
        select: {
          source: true,
          marketId: true,
          sellingTotal: true,
          market: { select: { name: true } },
        },
      });

      const r = (v: number) => Math.round(v * 100) / 100;

      // By source
      const sourceMap = new Map<string, { count: number; revenue: number }>();
      for (const b of bookings) {
        const revenue = Number(b.sellingTotal);
        const existing = sourceMap.get(b.source);
        if (existing) {
          existing.count++;
          existing.revenue += revenue;
        } else {
          sourceMap.set(b.source, { count: 1, revenue });
        }
      }

      // By market
      const marketMap = new Map<string, { marketName: string; count: number; revenue: number }>();
      for (const b of bookings) {
        if (!b.marketId || !b.market) continue;
        const revenue = Number(b.sellingTotal);
        const existing = marketMap.get(b.marketId);
        if (existing) {
          existing.count++;
          existing.revenue += revenue;
        } else {
          marketMap.set(b.marketId, { marketName: b.market.name, count: 1, revenue });
        }
      }

      return {
        bySource: Array.from(sourceMap.entries()).map(([source, v]) => ({
          source,
          count: v.count,
          revenue: r(v.revenue),
        })),
        byMarket: Array.from(marketMap.values()).map((v) => ({
          marketName: v.marketName,
          count: v.count,
          revenue: r(v.revenue),
        })),
      };
    }),
});
