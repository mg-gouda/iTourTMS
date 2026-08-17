import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

const amendmentInput = z.object({
  bookingId: z.string(),
  description: z.string().min(1),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  priceImpact: z.number().optional(),
  penaltyApplied: z.number().optional(),
});

export const cruiseAmendmentRouter = createTRPCRouter({
  listByBooking: p("nile-cruises:booking:read")
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingAmendment.findMany({
        // CruiseBookingAmendment has no companyId — scope through its booking
        where: { bookingId: input.bookingId, booking: { companyId: ctx.companyId } },
        orderBy: { performedAt: "desc" },
      });
    }),

  dateChange: p("nile-cruises:booking:update")
    .input(amendmentInput.extend({ newDepartureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // The target departure must also belong to the caller's company
      const departure = await ctx.db.cruiseDeparture.findFirst({
        where: { id: input.newDepartureId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!departure) throw new TRPCError({ code: "NOT_FOUND" });
      const { count } = await ctx.db.cruiseBooking.updateMany({
        where: { id: input.bookingId, companyId: ctx.companyId },
        data: { departureId: input.newDepartureId },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.cruiseBookingAmendment.create({
        data: { type: "DATE_CHANGE", ...input, performedById: ctx.session.user.id },
      });
    }),

  cabinChange: p("nile-cruises:booking:update")
    .input(amendmentInput)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.cruiseBooking.findFirst({
        where: { id: input.bookingId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.cruiseBookingAmendment.create({
        data: { type: "CABIN_CHANGE", ...input, performedById: ctx.session.user.id },
      });
    }),

  paxChange: p("nile-cruises:booking:update")
    .input(amendmentInput.extend({ adults: z.number().int().min(1), children: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.cruiseBooking.updateMany({
        where: { id: input.bookingId, companyId: ctx.companyId },
        data: { adults: input.adults, children: input.children },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.cruiseBookingAmendment.create({
        data: { type: "PAX_CHANGE", ...input, performedById: ctx.session.user.id },
      });
    }),

  occupancyChange: p("nile-cruises:booking:update")
    .input(amendmentInput)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.cruiseBooking.findFirst({
        where: { id: input.bookingId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.cruiseBookingAmendment.create({
        data: { type: "OCCUPANCY_CHANGE", ...input, performedById: ctx.session.user.id },
      });
    }),
});
