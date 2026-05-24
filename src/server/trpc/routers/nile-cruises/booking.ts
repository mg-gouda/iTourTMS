import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseBookingCreateSchema, cruiseBookingUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

const bookingInclude = {
  departure: {
    include: {
      boat: { select: { id: true, name: true, code: true } },
      cruiseType: { select: { id: true, name: true, durationNights: true } },
    },
  },
  contract: { select: { id: true, code: true, name: true } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true } },
  tourOperator: { select: { id: true, name: true, code: true } },
  market: { select: { id: true, name: true } },
};

export const cruiseBookingRouter = createTRPCRouter({
  list: p("nile-cruises:booking:read")
    .input(z.object({
      status: z.string().optional(),
      boatId: z.string().optional(),
      departureId: z.string().optional(),
      tourOperatorId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.status ? { status: input.status as never } : {}),
          ...(input.departureId ? { departureId: input.departureId } : {}),
          ...(input.tourOperatorId ? { tourOperatorId: input.tourOperatorId } : {}),
          ...(input.from ? { departure: { embarkDate: { gte: new Date(input.from) } } } : {}),
          ...(input.to ? { departure: { embarkDate: { lte: new Date(input.to) } } } : {}),
        },
        include: bookingInclude,
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }),

  getById: p("nile-cruises:booking:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          ...bookingInclude,
          passengers: {
            include: {
              title: true,
              nationality: { select: { id: true, name: true, code: true } },
            },
          },
          cabinLines: { include: { cabinCategory: true }, orderBy: { sortOrder: "asc" } },
          payments: { orderBy: { paidAt: "desc" } },
          specialRequests: { orderBy: { createdAt: "asc" } },
          communications: { orderBy: { occurredAt: "desc" } },
          cabinAssignments: { include: { cabin: { include: { deck: true, category: true } } } },
          vouchers: { orderBy: { issuedAt: "desc" } },
          amendments: { orderBy: { performedAt: "desc" } },
        },
      });
    }),

  create: p("nile-cruises:booking:create")
    .input(cruiseBookingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "cruise_booking" } },
        update: { nextNumber: { increment: 1 } },
        create: { companyId: ctx.companyId, code: "cruise_booking", prefix: "NC-BK", nextNumber: 2, padding: 5 },
      });
      const code = `${seq.prefix}-${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;
      return ctx.db.cruiseBooking.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          code,
          createdById: ctx.session.user.id,
        },
      });
    }),

  update: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string(), data: cruiseBookingUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { ...input.data, updatedById: ctx.session.user.id },
      });
    }),

  transition: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string(), status: z.enum(["DRAFT","OPTION","ON_REQUEST","CONFIRMED","EMBARKED","DISEMBARKED","FINALIZED","CANCELLED","NO_SHOW"]) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { status: input.status, updatedById: ctx.session.user.id },
      });
    }),

  confirm: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.cruiseBooking.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      // Deduct allotment for each cabin line
      const cabinLines = await ctx.db.cruiseBookingCabinLine.findMany({
        where: { bookingId: booking.id },
      });
      for (const line of cabinLines) {
        await ctx.db.cruiseAllotment.updateMany({
          where: {
            contractId: booking.contractId,
            departureId: booking.departureId,
            cabinCategoryId: line.cabinCategoryId,
          },
          data: { soldCabins: { increment: 1 } },
        });
      }
      return ctx.db.cruiseBooking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", confirmedAt: new Date(), updatedById: ctx.session.user.id },
      });
    }),

  cancel: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string(), reason: z.string().min(1), penalty: z.number().min(0).optional() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.cruiseBooking.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
      });
      // Restore allotment
      if (booking.status === "CONFIRMED" || booking.status === "OPTION") {
        const cabinLines = await ctx.db.cruiseBookingCabinLine.findMany({
          where: { bookingId: booking.id },
        });
        for (const line of cabinLines) {
          await ctx.db.cruiseAllotment.updateMany({
            where: { contractId: booking.contractId, departureId: booking.departureId, cabinCategoryId: line.cabinCategoryId },
            data: { soldCabins: { decrement: 1 } },
          });
        }
      }
      return ctx.db.cruiseBooking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledReason: input.reason,
          cancellationPenalty: input.penalty ?? null,
          updatedById: ctx.session.user.id,
        },
      });
    }),

  markEmbarked: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { status: "EMBARKED", embarkedAt: new Date() },
      });
    }),

  markDisembarked: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { status: "DISEMBARKED", disembarkedAt: new Date() },
      });
    }),

  finalize: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBooking.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { status: "FINALIZED", finalizedAt: new Date() },
      });
    }),

  search: p("nile-cruises:booking:read")
    .input(z.object({
      embarkDateFrom: z.string().optional(),
      embarkDateTo: z.string().optional(),
      boatId: z.string().optional(),
      cruiseTypeId: z.string().optional(),
      adults: z.number().int().min(1).default(2),
      children: z.number().int().min(0).default(0),
      cabinCategoryId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseDeparture.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["SCHEDULED", "OPEN_FOR_SALE"] },
          ...(input.boatId ? { boatId: input.boatId } : {}),
          ...(input.cruiseTypeId ? { cruiseTypeId: input.cruiseTypeId } : {}),
          ...(input.embarkDateFrom ? { embarkDate: { gte: new Date(input.embarkDateFrom) } } : {}),
          ...(input.embarkDateTo ? { embarkDate: { lte: new Date(input.embarkDateTo) } } : {}),
        },
        include: {
          boat: { select: { id: true, name: true, code: true, starRating: true } },
          cruiseType: { select: { id: true, name: true, durationNights: true, embarkPort: true, disembarkPort: true } },
          contract: { select: { id: true, baseCurrency: true, includesFullBoard: true, includesSightseeing: true } },
          allotments: { include: { cabinCategory: true } },
        },
        orderBy: { embarkDate: "asc" },
      });
    }),

  getRateBreakdown: p("nile-cruises:booking:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.cruiseBooking.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: { cabinLines: { include: { cabinCategory: true } } },
      });
      return {
        cabinLines: booking.cabinLines,
        netTotal: booking.netTotal,
        markup: booking.markup,
        discounts: booking.discounts,
        galaSupplement: booking.galaSupplement,
        grossTotal: booking.grossTotal,
        paidAmount: booking.paidAmount,
        balanceDue: booking.balanceDue,
      };
    }),

  amend: p("nile-cruises:booking:update")
    .input(z.object({
      id: z.string(),
      type: z.enum(["DATE_CHANGE","CABIN_CHANGE","PAX_CHANGE","OCCUPANCY_CHANGE"]),
      description: z.string().min(1),
      oldValue: z.any().optional(),
      newValue: z.any().optional(),
      priceImpact: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingAmendment.create({
        data: {
          bookingId: input.id,
          type: input.type,
          description: input.description,
          oldValue: input.oldValue ?? null,
          newValue: input.newValue ?? null,
          priceImpact: input.priceImpact ?? null,
          performedById: ctx.session.user.id,
        },
      });
    }),
});
