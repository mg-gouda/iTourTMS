import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseReportsRouter = createTRPCRouter({
  occupancySummary: p("nile-cruises:reports:read")
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
      boatId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const departures = await ctx.db.cruiseDeparture.findMany({
        where: {
          companyId: ctx.companyId,
          embarkDate: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
          ...(input.boatId ? { boatId: input.boatId } : {}),
        },
        include: {
          boat: { select: { id: true, name: true, totalCabins: true } },
          cruiseType: { select: { id: true, name: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { embarkDate: "asc" },
      });

      const departureIds = departures.map((d) => d.id);
      const bookingAggs = await ctx.db.cruiseBooking.groupBy({
        by: ["departureId"],
        where: {
          departureId: { in: departureIds },
          status: { in: ["CONFIRMED", "EMBARKED", "DISEMBARKED", "FINALIZED"] },
        },
        _sum: { grossTotal: true, adults: true, children: true, infants: true },
        _count: { id: true },
      });
      const aggMap = new Map(bookingAggs.map((a) => [a.departureId, a]));

      return departures.map((dep) => {
        const agg = aggMap.get(dep.id);
        const totalPax = (agg?._sum.adults ?? 0) + (agg?._sum.children ?? 0) + (agg?._sum.infants ?? 0);
        const revenue = Number(agg?._sum?.grossTotal ?? 0);
        const confirmedCount = agg?._count.id ?? 0;
        const occupancy = dep.boat.totalCabins > 0
          ? Math.round((confirmedCount / dep.boat.totalCabins) * 100)
          : 0;
        return {
          departureId: dep.id,
          code: dep.code,
          embarkDate: dep.embarkDate,
          disembarkDate: dep.disembarkDate,
          boat: dep.boat,
          cruiseType: dep.cruiseType,
          bookings: dep._count.bookings,
          confirmedBookings: confirmedCount,
          totalPax,
          totalRevenue: revenue,
          occupancyRate: occupancy,
          status: dep.status,
        };
      });
    }),

  revenueSummary: p("nile-cruises:reports:read")
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
      groupBy: z.enum(["boat", "cruise_type", "month"]).default("month"),
    }))
    .query(async ({ ctx, input }) => {
      const bookings = await ctx.db.cruiseBooking.findMany({
        where: {
          companyId: ctx.companyId,
          departure: {
            embarkDate: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
          },
          status: { in: ["CONFIRMED", "EMBARKED", "DISEMBARKED", "FINALIZED"] },
        },
        include: {
          departure: {
            select: {
              embarkDate: true,
              boat: { select: { id: true, name: true } },
              cruiseType: { select: { id: true, name: true } },
            },
          },
        },
      });

      const grouped: Record<string, { label: string; revenue: number; bookings: number; pax: number }> = {};

      for (const b of bookings) {
        let key: string;
        let label: string;
        if (input.groupBy === "boat") {
          key = b.departure.boat.id;
          label = b.departure.boat.name;
        } else if (input.groupBy === "cruise_type") {
          key = b.departure.cruiseType.id;
          label = b.departure.cruiseType.name;
        } else {
          key = b.departure.embarkDate.toISOString().slice(0, 7);
          label = key;
        }
        if (!grouped[key]) grouped[key] = { label, revenue: 0, bookings: 0, pax: 0 };
        grouped[key].revenue += Number(b.grossTotal ?? 0);
        grouped[key].bookings += 1;
        grouped[key].pax += b.adults + b.children + b.infants;
      }

      return Object.entries(grouped).map(([key, data]) => ({ key, ...data }));
    }),

  passengerNationalities: p("nile-cruises:reports:read")
    .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
    .query(async ({ ctx, input }) => {
      const passengers = await ctx.db.cruisePassenger.findMany({
        where: {
          booking: {
            companyId: ctx.companyId,
            departure: {
              embarkDate: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
            },
            status: { in: ["CONFIRMED", "EMBARKED", "DISEMBARKED", "FINALIZED"] },
          },
        },
        include: { nationality: { select: { id: true, name: true, code: true } } },
      });

      const byNationality: Record<string, { countryId: string; countryName: string; count: number }> = {};
      for (const pax of passengers) {
        if (!pax.nationality) continue;
        if (!byNationality[pax.nationality.id]) {
          byNationality[pax.nationality.id] = { countryId: pax.nationality.id, countryName: pax.nationality.name, count: 0 };
        }
        byNationality[pax.nationality.id].count++;
      }

      return Object.values(byNationality).sort((a, b) => b.count - a.count);
    }),

  cancellationReport: p("nile-cruises:reports:read")
    .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.findMany({
        where: {
          companyId: ctx.companyId,
          status: "CANCELLED",
          cancelledAt: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
        },
        include: {
          departure: {
            select: {
              code: true,
              embarkDate: true,
              boat: { select: { name: true } },
            },
          },
        },
        orderBy: { cancelledAt: "desc" },
      });
    }),

  agentPerformance: p("nile-cruises:reports:read")
    .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
    .query(async ({ ctx, input }) => {
      const bookings = await ctx.db.cruiseBooking.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["CONFIRMED", "EMBARKED", "DISEMBARKED", "FINALIZED"] },
          createdAt: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
          tourOperatorId: { not: null },
        },
        include: {
          tourOperator: { select: { id: true, name: true, code: true } },
        },
      });

      const byAgent: Record<string, { toId: string; toName: string; bookings: number; revenue: number }> = {};
      for (const b of bookings) {
        if (!b.tourOperator) continue;
        if (!byAgent[b.tourOperator.id]) {
          byAgent[b.tourOperator.id] = { toId: b.tourOperator.id, toName: b.tourOperator.name, bookings: 0, revenue: 0 };
        }
        byAgent[b.tourOperator.id].bookings++;
        byAgent[b.tourOperator.id].revenue += Number(b.grossTotal ?? 0);
      }

      return Object.values(byAgent).sort((a, b) => b.revenue - a.revenue);
    }),

  paymentStatus: p("nile-cruises:reports:read")
    .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["CONFIRMED", "EMBARKED"] },
          departure: {
            embarkDate: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
          },
        },
        select: {
          id: true,
          code: true,
          leadGuestName: true,
          grossTotal: true,
          paidAmount: true,
          balanceDue: true,
          status: true,
          departure: { select: { code: true, embarkDate: true } },
        },
        orderBy: { balanceDue: "desc" },
      });
    }),

  manifestReport: p("nile-cruises:reports:read")
    .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseManifest.findMany({
        where: {
          departure: {
            companyId: ctx.companyId,
            embarkDate: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
          },
        },
        include: {
          departure: {
            select: {
              code: true,
              embarkDate: true,
              disembarkDate: true,
              boat: { select: { name: true } },
            },
          },
        },
        orderBy: { departure: { embarkDate: "asc" } },
      });
    }),

  guideRoster: p("nile-cruises:reports:read")
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
      boatId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const departures = await ctx.db.cruiseDeparture.findMany({
        where: {
          companyId: ctx.companyId,
          embarkDate: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
          status: { in: ["SCHEDULED", "OPEN_FOR_SALE", "EMBARKING", "SAILING"] },
          ...(input.boatId ? { boatId: input.boatId } : {}),
        },
        include: {
          boat: { select: { name: true, code: true } },
          cruiseType: { select: { name: true } },
          bookings: {
            where: { status: { in: ["CONFIRMED", "EMBARKED", "DISEMBARKED"] } },
            include: {
              passengers: {
                include: { nationality: { select: { name: true, code: true } } },
                orderBy: { lastName: "asc" },
              },
              cabinLines: {
                include: { cabinCategory: { select: { name: true, code: true } } },
              },
            },
          },
        },
        orderBy: { embarkDate: "asc" },
      });
      return departures;
    }),

  contractUtilization: p("nile-cruises:reports:read")
    .input(z.object({ contractId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const allotments = await ctx.db.cruiseAllotment.findMany({
        where: {
          contract: { companyId: ctx.companyId },
          ...(input.contractId ? { contractId: input.contractId } : {}),
        },
        include: {
          contract: { select: { code: true, boat: { select: { name: true } } } },
          departure: { select: { code: true, embarkDate: true } },
          cabinCategory: { select: { name: true } },
        },
      });

      return allotments.map((a) => ({
        ...a,
        utilization: a.totalCabins > 0
          ? Math.round((a.soldCabins / a.totalCabins) * 100)
          : 0,
      }));
    }),
});
