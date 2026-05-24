import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseCabinAssignmentRouter = createTRPCRouter({
  listByDeparture: p("nile-cruises:departure:read")
    .input(z.object({ departureId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cabinAssignment.findMany({
        where: { departureId: input.departureId },
        include: {
          cabin: { include: { deck: true, category: true } },
          booking: { select: { id: true, code: true, leadGuestName: true, adults: true, children: true } },
        },
      });
    }),

  autoAssign: p("nile-cruises:departure:update")
    .input(z.object({ departureId: z.string(), bookingId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const departure = await ctx.db.cruiseDeparture.findFirstOrThrow({
        where: { id: input.departureId, companyId: ctx.companyId },
      });
      const existingAssignments = await ctx.db.cabinAssignment.findMany({
        where: { departureId: input.departureId },
        select: { cabinId: true },
      });
      const assignedCabinIds = new Set(existingAssignments.map((a) => a.cabinId));

      const bookings = await ctx.db.cruiseBooking.findMany({
        where: {
          departureId: input.departureId,
          status: { in: ["CONFIRMED"] },
          ...(input.bookingId ? { id: input.bookingId } : {}),
        },
        include: { cabinLines: true },
      });

      const created: string[] = [];
      for (const booking of bookings) {
        for (const line of booking.cabinLines) {
          // Find available cabin matching category
          const availableCabin = await ctx.db.cruiseCabin.findFirst({
            where: {
              boatId: departure.boatId,
              categoryId: line.cabinCategoryId,
              active: true,
              id: { notIn: Array.from(assignedCabinIds) },
            },
          });
          if (availableCabin) {
            const assignment = await ctx.db.cabinAssignment.create({
              data: {
                departureId: input.departureId,
                bookingId: booking.id,
                cabinId: availableCabin.id,
                status: "PROVISIONAL",
                assignedById: ctx.session.user.id,
              },
            });
            assignedCabinIds.add(availableCabin.id);
            created.push(assignment.id);
          }
        }
      }
      return { assigned: created.length };
    }),

  assignManual: p("nile-cruises:departure:update")
    .input(z.object({ departureId: z.string(), bookingId: z.string(), cabinId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cabinAssignment.upsert({
        where: { departureId_cabinId: { departureId: input.departureId, cabinId: input.cabinId } },
        update: { bookingId: input.bookingId, status: "CONFIRMED", assignedById: ctx.session.user.id, confirmedAt: new Date() },
        create: {
          departureId: input.departureId,
          bookingId: input.bookingId,
          cabinId: input.cabinId,
          status: "CONFIRMED",
          assignedById: ctx.session.user.id,
          confirmedAt: new Date(),
        },
      });
    }),

  bulkReassign: p("nile-cruises:departure:update")
    .input(z.object({
      departureId: z.string(),
      assignments: z.array(z.object({ bookingId: z.string(), cabinId: z.string() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const a of input.assignments) {
        results.push(
          await ctx.db.cabinAssignment.upsert({
            where: { departureId_cabinId: { departureId: input.departureId, cabinId: a.cabinId } },
            update: { bookingId: a.bookingId, assignedById: ctx.session.user.id },
            create: { departureId: input.departureId, ...a, status: "PROVISIONAL", assignedById: ctx.session.user.id },
          })
        );
      }
      return { updated: results.length };
    }),

  lockAll: p("nile-cruises:departure:update")
    .input(z.object({ departureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cabinAssignment.updateMany({
        where: { departureId: input.departureId },
        data: { status: "LOCKED" },
      });
    }),

  unlock: p("nile-cruises:departure:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cabinAssignment.update({
        where: { id: input.id },
        data: { status: "CONFIRMED" },
      });
    }),
});
