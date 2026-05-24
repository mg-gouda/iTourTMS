import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseSearchRouter = createTRPCRouter({
  availability: p("nile-cruises:search:read")
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
      nights: z.number().int().min(1).optional(),
      cruiseTypeId: z.string().optional(),
      boatId: z.string().optional(),
      adults: z.number().int().min(1).default(2),
      children: z.number().int().min(0).default(0),
      cabinCategoryId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const departures = await ctx.db.cruiseDeparture.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["OPEN_FOR_SALE", "CLOSED_FOR_SALE"] },
          embarkDate: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
          ...(input.boatId ? { boatId: input.boatId } : {}),
          ...(input.cruiseTypeId ? { cruiseTypeId: input.cruiseTypeId } : {}),
        },
        include: {
          boat: { select: { id: true, name: true, starRating: true, totalCabins: true } },
          cruiseType: { select: { id: true, name: true, durationNights: true } },
          allotments: {
            where: {
              ...(input.cabinCategoryId ? { cabinCategoryId: input.cabinCategoryId } : {}),
            },
            include: { cabinCategory: { select: { id: true, name: true, code: true } } },
          },
        },
        orderBy: { embarkDate: "asc" },
      });

      return departures.filter((dep) => {
        if (input.nights && dep.cruiseType.durationNights !== input.nights) return false;
        return dep.allotments.some((a) => a.totalCabins > a.soldCabins);
      }).map((dep) => ({
        departureId: dep.id,
        code: dep.code,
        embarkDate: dep.embarkDate,
        disembarkDate: dep.disembarkDate,
        boat: dep.boat,
        cruiseType: dep.cruiseType,
        availableCategories: dep.allotments
          .filter((a) => a.totalCabins > a.soldCabins)
          .map((a) => ({
            allotmentId: a.id,
            cabinCategory: a.cabinCategory,
            availableCabins: a.totalCabins - a.soldCabins,
            allocationBasis: a.allocationBasis,
          })),
      }));
    }),

  globalSearch: p("nile-cruises:search:read")
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const q = input.query.trim();
      const [bookings, departures, boats, passengers] = await Promise.all([
        ctx.db.cruiseBooking.findMany({
          where: {
            companyId: ctx.companyId,
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { leadGuestName: { contains: q, mode: "insensitive" } },
              { leadGuestEmail: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
          select: {
            id: true,
            code: true,
            leadGuestName: true,
            status: true,
            departure: { select: { code: true, embarkDate: true } },
          },
        }),
        ctx.db.cruiseDeparture.findMany({
          where: {
            companyId: ctx.companyId,
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { boat: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
          take: 5,
          select: {
            id: true,
            code: true,
            embarkDate: true,
            disembarkDate: true,
            boat: { select: { name: true } },
            status: true,
          },
        }),
        ctx.db.cruiseBoat.findMany({
          where: {
            companyId: ctx.companyId,
            name: { contains: q, mode: "insensitive" },
          },
          take: 5,
          select: { id: true, name: true, active: true, boatClass: true },
        }),
        ctx.db.cruisePassenger.findMany({
          where: {
            booking: { companyId: ctx.companyId },
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { passportNumber: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            passportNumber: true,
            booking: { select: { code: true } },
          },
        }),
      ]);

      return { bookings, departures, boats, passengers };
    }),

  checkCabinAvailability: p("nile-cruises:search:read")
    .input(z.object({ departureId: z.string(), cabinCategoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const allotment = await ctx.db.cruiseAllotment.findFirst({
        where: {
          departureId: input.departureId,
          cabinCategoryId: input.cabinCategoryId,
          contract: { companyId: ctx.companyId },
        },
        include: { cabinCategory: true },
      });

      const ownedCabins = await ctx.db.cruiseCabin.findMany({
        where: {
          categoryId: input.cabinCategoryId,
          active: true,
          deck: { boat: { departures: { some: { id: input.departureId } } } },
        },
        include: {
          deck: { select: { name: true, level: true } },
          assignments: {
            where: { booking: { departureId: input.departureId, status: { not: "CANCELLED" } } },
          },
        },
      });

      const availableOwned = ownedCabins.filter((c) => c.assignments.length === 0);

      return {
        allotment: allotment
          ? {
              availableCabins: allotment.totalCabins - allotment.soldCabins,
              allocationBasis: allotment.allocationBasis,
            }
          : null,
        ownedAvailable: availableOwned.length,
        ownedCabins: availableOwned.map((c) => ({
          id: c.id,
          number: c.cabinNumber,
          deck: c.deck.name,
          bedType: c.bedType,
        })),
      };
    }),
});
