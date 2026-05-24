import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruisePassengerSchema, cruiseBulkSavePassengersSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruisePassengerRouter = createTRPCRouter({
  listByBooking: p("nile-cruises:booking:read")
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruisePassenger.findMany({
        where: { bookingId: input.bookingId },
        include: {
          title: true,
          nationality: { select: { id: true, name: true, code: true } },
          passportIssueCountry: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ isLead: "desc" }, { lastName: "asc" }],
      });
    }),

  create: p("nile-cruises:booking:update")
    .input(cruisePassengerSchema)
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input };
      if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth as string);
      if (data.passportIssueDate) data.passportIssueDate = new Date(data.passportIssueDate as string);
      if (data.passportExpiryDate) data.passportExpiryDate = new Date(data.passportExpiryDate as string);
      return ctx.db.cruisePassenger.create({ data: data as Parameters<typeof ctx.db.cruisePassenger.create>[0]["data"] });
    }),

  update: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string(), data: cruisePassengerSchema.omit({ bookingId: true }).partial() }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth as string);
      if (data.passportIssueDate) data.passportIssueDate = new Date(data.passportIssueDate as string);
      if (data.passportExpiryDate) data.passportExpiryDate = new Date(data.passportExpiryDate as string);
      return ctx.db.cruisePassenger.update({ where: { id: input.id }, data });
    }),

  delete: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruisePassenger.delete({ where: { id: input.id } });
    }),

  bulkSave: p("nile-cruises:booking:update")
    .input(cruiseBulkSavePassengersSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cruisePassenger.deleteMany({ where: { bookingId: input.bookingId } });
      if (input.passengers.length === 0) return { count: 0 };
      return ctx.db.cruisePassenger.createMany({
        data: input.passengers.map((p) => ({
          ...p,
          bookingId: input.bookingId,
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
          passportIssueDate: p.passportIssueDate ? new Date(p.passportIssueDate) : null,
          passportExpiryDate: p.passportExpiryDate ? new Date(p.passportExpiryDate) : null,
        })),
      });
    }),

  import: p("nile-cruises:booking:update")
    .input(z.object({ bookingId: z.string(), csv: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // CSV parsing stub — real implementation would parse lines
      return { imported: 0, errors: ["CSV import not implemented — use bulkSave"] };
    }),
});
