import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseSpecialRequestCreateSchema, cruiseSpecialRequestUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseSpecialRequestRouter = createTRPCRouter({
  listByBooking: p("nile-cruises:booking:read")
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseSpecialRequest.findMany({
        where: { bookingId: input.bookingId },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: p("nile-cruises:booking:update")
    .input(cruiseSpecialRequestCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseSpecialRequest.create({ data: input });
    }),

  update: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string(), data: cruiseSpecialRequestUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseSpecialRequest.update({ where: { id: input.id }, data: input.data });
    }),

  fulfill: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string(), response: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseSpecialRequest.update({
        where: { id: input.id },
        data: { status: "FULFILLED", response: input.response, fulfilledAt: new Date(), fulfilledById: ctx.session.user.id },
      });
    }),

  decline: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string(), response: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseSpecialRequest.update({
        where: { id: input.id },
        data: { status: "DECLINED", response: input.response },
      });
    }),

  delete: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseSpecialRequest.delete({ where: { id: input.id } });
    }),
});
