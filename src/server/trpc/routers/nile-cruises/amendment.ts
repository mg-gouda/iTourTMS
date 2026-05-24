import { z } from "zod";
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
        where: { bookingId: input.bookingId },
        orderBy: { performedAt: "desc" },
      });
    }),

  dateChange: p("nile-cruises:booking:update")
    .input(amendmentInput.extend({ newDepartureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseBooking.update({
        where: { id: input.bookingId },
        data: { departureId: input.newDepartureId },
      });
      return ctx.db.cruiseBookingAmendment.create({
        data: { type: "DATE_CHANGE", ...input, performedById: ctx.session.user.id },
      });
    }),

  cabinChange: p("nile-cruises:booking:update")
    .input(amendmentInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingAmendment.create({
        data: { type: "CABIN_CHANGE", ...input, performedById: ctx.session.user.id },
      });
    }),

  paxChange: p("nile-cruises:booking:update")
    .input(amendmentInput.extend({ adults: z.number().int().min(1), children: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruiseBooking.update({
        where: { id: input.bookingId },
        data: { adults: input.adults, children: input.children },
      });
      return ctx.db.cruiseBookingAmendment.create({
        data: { type: "PAX_CHANGE", ...input, performedById: ctx.session.user.id },
      });
    }),

  occupancyChange: p("nile-cruises:booking:update")
    .input(amendmentInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingAmendment.create({
        data: { type: "OCCUPANCY_CHANGE", ...input, performedById: ctx.session.user.id },
      });
    }),
});
