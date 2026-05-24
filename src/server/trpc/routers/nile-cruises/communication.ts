import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseCommunicationRouter = createTRPCRouter({
  listByBooking: p("nile-cruises:booking:read")
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingCommunication.findMany({
        where: { bookingId: input.bookingId },
        orderBy: { occurredAt: "desc" },
      });
    }),

  create: p("nile-cruises:booking:update")
    .input(z.object({
      bookingId: z.string(),
      direction: z.enum(["INBOUND", "OUTBOUND"]),
      channel: z.enum(["EMAIL", "PHONE", "WHATSAPP", "IN_PERSON"]),
      subject: z.string().optional(),
      body: z.string().min(1),
      occurredAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingCommunication.create({
        data: {
          ...input,
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
          recordedById: ctx.session.user.id,
        },
      });
    }),

  delete: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseBookingCommunication.delete({ where: { id: input.id } });
    }),
});
