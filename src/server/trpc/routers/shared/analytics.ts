import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { daysBetween, forecastFinal, pickupCurve, roomsByDate } from "@/server/services/analytics/forecast";
import { fxTable } from "@/server/services/analytics/fx";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

/** Signed-in staff with a company; analytics spans modules, so no single module gate. */
const companyProcedure = protectedProcedure.use(({ ctx, next }) => {
  const companyId = ctx.session.user.companyId;
  if (!companyId) throw new TRPCError({ code: "FORBIDDEN", message: "No company." });
  return next({ ctx: { ...ctx, companyId } });
});

const LIVE_HOTEL = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] as const;
const DAY = 86_400_000;

const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

type Ctx = { db: any; companyId: string; session: { user: { roles?: string[]; permissions?: string[] } } };

/** Modules this user may see analytics for: installed AND holding that module's report permission. */
async function visibleModules(ctx: Ctx) {
  const installed = await ctx.db.installedModule.findMany({
    where: { companyId: ctx.companyId, isInstalled: true },
    select: { name: true },
  });
  const { roles = [], permissions = [] } = ctx.session.user;
  const admin = roles.includes("super_admin");
  const REPORT: Record<string, string> = {
    reservations: "reservations:report:read",
    crm: "crm:report:read",
    traffic: "traffic:report:read",
    "nile-cruises": "nile-cruises:reports:read",
    "tour-ops": "tour-ops:report:read",
    finance: "finance:report:read",
  };
  return new Set(
    installed.map((m: { name: string }) => m.name).filter((n: string) => REPORT[n] && (admin || permissions.includes(REPORT[n]))),
  );
}

const require = async (ctx: Ctx, module: string) => {
  if (!(await visibleModules(ctx)).has(module)) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Missing report access for ${module}.` });
  }
};

const periodInput = z.object({ from: z.coerce.date(), to: z.coerce.date() }).refine((p) => p.to > p.from, "Bad period");

type Metric = { key: string; kind: "money" | "count"; value: number; previous?: number };

export const analyticsRouter = createTRPCRouter({
  /** Which analytics tabs/sections this user gets. */
  access: companyProcedure.query(async ({ ctx }) => [...(await visibleModules(ctx as unknown as Ctx))]),

  /** Headline numbers per module for a period, against the period just before it. Money in base currency. */
  overview: companyProcedure.input(periodInput).query(async ({ ctx, input }) => {
    const c = ctx as unknown as Ctx;
    const mods = await visibleModules(c);
    const fx = await fxTable(ctx.db, ctx.companyId);
    const span = input.to.getTime() - input.from.getTime();
    const prev = { from: new Date(input.from.getTime() - span), to: input.from };
    const co = ctx.companyId;

    const hotel = async (p: { from: Date; to: Date }) => {
      const rows = await ctx.db.booking.findMany({
        where: { companyId: co, status: { in: [...LIVE_HOTEL] }, createdAt: { gte: p.from, lt: p.to } },
        select: { noOfRooms: true, nights: true, sellingTotal: true, buyingTotal: true, currencyId: true },
      });
      let revenue = 0, cost = 0, rn = 0;
      for (const b of rows) {
        revenue += fx.toBase(b.sellingTotal, b.currencyId);
        cost += fx.toBase(b.buyingTotal, b.currencyId);
        rn += b.noOfRooms * b.nights;
      }
      return { bookings: rows.length, roomNights: rn, revenue, margin: revenue - cost };
    };
    const excursions = async (p: { from: Date; to: Date }) => {
      const rows = await ctx.db.crmBooking.findMany({
        where: { companyId: co, status: { in: ["CONFIRMED", "COMPLETED"] }, createdAt: { gte: p.from, lt: p.to } },
        select: { totalSelling: true, totalCost: true, currency: true },
      });
      let revenue = 0, cost = 0;
      for (const b of rows) {
        revenue += fx.toBase(b.totalSelling, b.currency, true);
        cost += fx.toBase(b.totalCost, b.currency, true);
      }
      return { bookings: rows.length, revenue, margin: revenue - cost };
    };
    const transfers = async (p: { from: Date; to: Date }) => {
      const rows = await ctx.db.ttTrafficJob.findMany({
        where: { companyId: co, status: "COMPLETED", serviceDate: { gte: p.from, lt: p.to } },
        select: { price: true, cost: true, currencyId: true },
      });
      let revenue = 0, cost = 0;
      for (const j of rows) {
        // Jobs without a currency are priced in base currency.
        revenue += j.currencyId ? fx.toBase(j.price, j.currencyId) : Number(j.price);
        cost += j.currencyId ? fx.toBase(j.cost, j.currencyId) : Number(j.cost);
      }
      return { jobs: rows.length, revenue, margin: revenue - cost };
    };
    const cruises = async (p: { from: Date; to: Date }) => {
      const rows = await ctx.db.cruiseBooking.findMany({
        where: {
          companyId: co,
          status: { in: ["CONFIRMED", "EMBARKED", "DISEMBARKED", "FINALIZED"] },
          createdAt: { gte: p.from, lt: p.to },
        },
        select: { grossTotal: true, netTotal: true, baseCurrency: true },
      });
      let revenue = 0, cost = 0;
      for (const b of rows) {
        revenue += fx.toBase(b.grossTotal, b.baseCurrency, true);
        cost += fx.toBase(b.netTotal, b.baseCurrency, true);
      }
      return { bookings: rows.length, revenue, margin: revenue - cost };
    };
    const files = async (p: { from: Date; to: Date }) => {
      const [created, confirmed] = await Promise.all([
        ctx.db.opsFile.count({ where: { companyId: co, createdAt: { gte: p.from, lt: p.to } } }),
        ctx.db.opsFile.count({
          where: { companyId: co, createdAt: { gte: p.from, lt: p.to }, status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } },
        }),
      ]);
      return { created, confirmed };
    };
    const pair = async <T extends Record<string, number>>(fn: (p: { from: Date; to: Date }) => Promise<T>) => {
      const [now, before] = await Promise.all([fn(input), fn(prev)]);
      return (key: keyof T & string, kind: Metric["kind"]): Metric => ({ key, kind, value: now[key], previous: before[key] });
    };

    const sections: { key: string; metrics: Metric[] }[] = [];
    if (mods.has("reservations")) {
      const m = await pair(hotel);
      sections.push({ key: "hotels", metrics: [m("bookings", "count"), m("roomNights", "count"), m("revenue", "money"), m("margin", "money")] });
    }
    if (mods.has("crm")) {
      const m = await pair(excursions);
      const [leads, leadsBefore, pipeline] = await Promise.all([
        ctx.db.crmLead.count({ where: { companyId: co, createdAt: { gte: input.from, lt: input.to } } }),
        ctx.db.crmLead.count({ where: { companyId: co, createdAt: { gte: prev.from, lt: prev.to } } }),
        ctx.db.crmOpportunity.aggregate({
          where: { companyId: co, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
          _sum: { value: true },
        }),
      ]);
      sections.push({
        key: "excursions",
        metrics: [
          m("bookings", "count"),
          m("revenue", "money"),
          m("margin", "money"),
          { key: "newLeads", kind: "count", value: leads, previous: leadsBefore },
          { key: "openPipeline", kind: "money", value: Number(pipeline._sum.value ?? 0) },
        ],
      });
    }
    if (mods.has("traffic")) {
      const m = await pair(transfers);
      sections.push({ key: "transfers", metrics: [m("jobs", "count"), m("revenue", "money"), m("margin", "money")] });
    }
    if (mods.has("nile-cruises")) {
      const m = await pair(cruises);
      sections.push({ key: "cruises", metrics: [m("bookings", "count"), m("revenue", "money"), m("margin", "money")] });
    }
    if (mods.has("tour-ops")) {
      const m = await pair(files);
      sections.push({ key: "tourOps", metrics: [m("created", "count"), m("confirmed", "count")] });
    }
    if (mods.has("finance")) {
      // A snapshot, not a period: what is owed right now.
      const today = utcDay(new Date());
      const open = await ctx.db.move.findMany({
        where: { companyId: co, state: "POSTED", moveType: { in: ["OUT_INVOICE", "IN_INVOICE"] }, amountResidual: { gt: 0 } },
        select: { moveType: true, amountResidual: true, currencyId: true, invoiceDateDue: true },
      });
      const sum = { receivable: 0, receivableOverdue: 0, payable: 0, payableOverdue: 0 };
      for (const mv of open) {
        const amt = fx.toBase(mv.amountResidual, mv.currencyId);
        const overdue = mv.invoiceDateDue && mv.invoiceDateDue < today;
        if (mv.moveType === "OUT_INVOICE") {
          sum.receivable += amt;
          if (overdue) sum.receivableOverdue += amt;
        } else {
          sum.payable += amt;
          if (overdue) sum.payableOverdue += amt;
        }
      }
      sections.push({
        key: "finance",
        metrics: (Object.keys(sum) as (keyof typeof sum)[]).map((k) => ({ key: k, kind: "money" as const, value: sum[k] })),
      });
    }
    return { baseCode: fx.baseCode, missingRates: fx.missing(), previous: prev, sections };
  }),

  /**
   * Rooms on the books for the coming weeks, the expected final count from the
   * company's own booking pace, and the contracted allotment to sell into.
   */
  occupancyForecast: companyProcedure
    .input(z.object({ weeks: z.number().int().min(1).max(26).default(13), hotelId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await require(ctx as unknown as Ctx, "reservations");
      const co = ctx.companyId;
      const today = utcDay(new Date());
      const days = input.weeks * 7;
      const end = addDays(today, days);

      const [history, future] = await Promise.all([
        ctx.db.booking.findMany({
          where: { companyId: co, status: { in: [...LIVE_HOTEL] }, checkIn: { gte: addDays(today, -365), lt: today } },
          select: { checkIn: true, createdAt: true, noOfRooms: true, nights: true },
        }),
        ctx.db.booking.findMany({
          where: {
            companyId: co,
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
            checkIn: { lt: end },
            checkOut: { gt: today },
            ...(input.hotelId && { hotelId: input.hotelId }),
          },
          select: { hotelId: true, checkIn: true, checkOut: true, noOfRooms: true, hotel: { select: { name: true, totalRooms: true } } },
        }),
      ]);
      const curve = pickupCurve(
        history.map((b) => ({ leadDays: daysBetween(b.createdAt, b.checkIn), roomNights: b.noOfRooms * b.nights })),
      );

      const hotelIds = [...new Set(future.map((b) => b.hotelId))];
      const allotments = hotelIds.length
        ? await ctx.db.contractAllotment.findMany({
            where: {
              freeSale: false,
              contract: { hotelId: { in: hotelIds }, status: "PUBLISHED", validFrom: { lt: end }, validTo: { gte: today } },
            },
            select: {
              totalRooms: true,
              season: { select: { dateFrom: true, dateTo: true } },
              contract: { select: { hotelId: true, validFrom: true, validTo: true } },
            },
          })
        : [];

      const weekOf = (d: number) => Math.floor(d / 7);
      const hotels = hotelIds.map((hotelId) => {
        const rows = future.filter((b) => b.hotelId === hotelId);
        const otb = roomsByDate(rows.map((b) => ({ checkIn: b.checkIn, checkOut: b.checkOut, rooms: b.noOfRooms })), today, days);
        const cap = new Array<number>(days).fill(0);
        let hasAllotment = false;
        for (const a of allotments.filter((x) => x.contract.hotelId === hotelId)) {
          hasAllotment = true;
          const from = a.season?.dateFrom ?? a.contract.validFrom;
          const to = a.season?.dateTo ?? a.contract.validTo; // inclusive
          for (let d = Math.max(0, daysBetween(today, from)); d <= Math.min(days - 1, daysBetween(today, to)); d++) cap[d] += a.totalRooms;
        }
        const fallback = rows[0].hotel.totalRooms;
        const weeks = Array.from({ length: input.weeks }, () => ({ otb: 0, forecast: 0, capacity: 0 as number | null }));
        for (let d = 0; d < days; d++) {
          const w = weeks[weekOf(d)];
          w.otb += otb[d];
          w.forecast += forecastFinal(otb[d], d, curve);
          // A day outside every loaded allotment falls back to the hotel's room count;
          // with neither, the whole week's capacity is unknown rather than zero.
          const dayCap = cap[d] || fallback || null;
          w.capacity = w.capacity === null || dayCap === null ? null : w.capacity + dayCap;
        }
        return {
          hotelId,
          name: rows[0].hotel.name,
          capacitySource: hasAllotment ? ("allotment" as const) : fallback ? ("hotelRooms" as const) : null,
          weeks: weeks.map((w) => ({ otb: w.otb, forecast: Math.round(w.forecast), capacity: w.capacity })),
        };
      });
      hotels.sort((a, b) => b.weeks.reduce((s, w) => s + w.forecast, 0) - a.weeks.reduce((s, w) => s + w.forecast, 0));

      return {
        from: today,
        weekStarts: Array.from({ length: input.weeks }, (_, i) => addDays(today, i * 7)),
        historySize: history.length,
        hotels,
      };
    }),

  /** Per tour operator for stays in the period: volume, value, cancellations, lead time, growth, credit. */
  partnerPerformance: companyProcedure.input(periodInput).query(async ({ ctx, input }) => {
    await require(ctx as unknown as Ctx, "reservations");
    const co = ctx.companyId;
    const fx = await fxTable(ctx.db, co);
    const lastYear = (d: Date) => new Date(Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate()));

    const [rows, prevRows] = await Promise.all([
      ctx.db.booking.findMany({
        where: { companyId: co, tourOperatorId: { not: null }, checkIn: { gte: input.from, lt: input.to } },
        select: {
          tourOperatorId: true,
          status: true,
          noOfRooms: true,
          nights: true,
          sellingTotal: true,
          buyingTotal: true,
          currencyId: true,
          createdAt: true,
          checkIn: true,
        },
      }),
      ctx.db.booking.findMany({
        where: {
          companyId: co,
          tourOperatorId: { not: null },
          status: { in: [...LIVE_HOTEL] },
          checkIn: { gte: lastYear(input.from), lt: lastYear(input.to) },
        },
        select: { tourOperatorId: true, sellingTotal: true, currencyId: true },
      }),
    ]);

    const by = new Map<string, { total: number; live: number; cancelled: number; noShow: number; roomNights: number; revenue: number; cost: number; leadSum: number; lastYear: number }>();
    const get = (id: string) => {
      let r = by.get(id);
      if (!r) by.set(id, (r = { total: 0, live: 0, cancelled: 0, noShow: 0, roomNights: 0, revenue: 0, cost: 0, leadSum: 0, lastYear: 0 }));
      return r;
    };
    for (const b of rows) {
      const r = get(b.tourOperatorId!);
      r.total++;
      if (b.status === "CANCELLED") r.cancelled++;
      else if (b.status === "NO_SHOW") r.noShow++;
      else if ((LIVE_HOTEL as readonly string[]).includes(b.status)) {
        r.live++;
        r.roomNights += b.noOfRooms * b.nights;
        r.revenue += fx.toBase(b.sellingTotal, b.currencyId);
        r.cost += fx.toBase(b.buyingTotal, b.currencyId);
        r.leadSum += Math.max(0, daysBetween(b.createdAt, b.checkIn));
      }
    }
    for (const b of prevRows) get(b.tourOperatorId!).lastYear += fx.toBase(b.sellingTotal, b.currencyId);

    const partners = await ctx.db.tourOperator.findMany({
      where: { companyId: co, id: { in: [...by.keys()] } },
      select: { id: true, name: true, creditLimit: true, creditUsed: true },
    });
    const result = partners.map((p) => {
      const r = by.get(p.id)!;
      return {
        id: p.id,
        name: p.name,
        bookings: r.total,
        liveBookings: r.live,
        roomNights: r.roomNights,
        revenue: r.revenue,
        margin: r.revenue - r.cost,
        marginPct: r.revenue ? ((r.revenue - r.cost) / r.revenue) * 100 : null,
        cancelPct: r.total ? (r.cancelled / r.total) * 100 : 0,
        noShowPct: r.total ? (r.noShow / r.total) * 100 : 0,
        avgLeadDays: r.live ? Math.round(r.leadSum / r.live) : null,
        lastYearRevenue: r.lastYear,
        growthPct: r.lastYear ? ((r.revenue - r.lastYear) / r.lastYear) * 100 : null,
        creditLimit: Number(p.creditLimit),
        creditUsed: Number(p.creditUsed),
      };
    });
    result.sort((a, b) => b.revenue - a.revenue);
    return { baseCode: fx.baseCode, missingRates: fx.missing(), partners: result };
  }),
});
