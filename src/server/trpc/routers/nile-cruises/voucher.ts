import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseVoucherRouter = createTRPCRouter({
  listByBooking: p("nile-cruises:booking:read")
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseVoucher.findMany({
        where: { bookingId: input.bookingId },
        orderBy: { issuedAt: "desc" },
      });
    }),

  generate: p("nile-cruises:booking:update")
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "cruise_voucher" } },
        update: { nextNumber: { increment: 1 } },
        create: { companyId: ctx.companyId, code: "cruise_voucher", prefix: "NC-VC", nextNumber: 2, padding: 5 },
      });
      const code = `${seq.prefix}-${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;
      await ctx.db.cruiseBooking.update({
        where: { id: input.bookingId },
        data: { voucherGeneratedAt: new Date() },
      });
      return ctx.db.cruiseVoucher.create({
        data: {
          bookingId: input.bookingId,
          code,
          status: "ISSUED",
          createdById: ctx.session.user.id,
        },
      });
    }),

  getById: p("nile-cruises:booking:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseVoucher.findFirstOrThrow({
        where: { id: input.id },
        include: { booking: true },
      });
    }),

  cancel: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseVoucher.update({
        where: { id: input.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
    }),

  markUsed: p("nile-cruises:booking:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseVoucher.update({
        where: { id: input.id },
        data: { status: "USED", usedAt: new Date() },
      });
    }),
});
