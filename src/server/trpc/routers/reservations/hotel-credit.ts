import { z } from "zod";

import {
  hotelCreditCreateSchema,
  hotelCreditApplySchema,
} from "@/lib/validations/reservations";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";
import { createHotelCreditFinanceRecord } from "@/server/services/reservations/finance-bridge";
import { logBookingAction } from "@/server/services/reservations/timeline-logger";

const proc = moduleProcedure("reservations");

export const hotelCreditRouter = createTRPCRouter({
  list: proc
    .input(
      z
        .object({
          hotelId: z.string().optional(),
          status: z
            .enum(["OPEN", "PARTIALLY_CONSUMED", "CONSUMED", "CANCELLED"])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.hotelCreditNote.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input?.hotelId ? { hotelId: input.hotelId } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        include: {
          hotel: { select: { id: true, name: true, code: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          sourceBooking: { select: { id: true, code: true } },
          createdBy: { select: { id: true, name: true } },
          consumptions: {
            include: {
              booking: { select: { id: true, code: true } },
              usedBy: { select: { id: true, name: true } },
            },
            orderBy: { usedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: proc.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.db.hotelCreditNote.findFirst({
      where: { id: input, companyId: ctx.companyId },
      include: {
        hotel: { select: { id: true, name: true, code: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        sourceBooking: { select: { id: true, code: true, checkIn: true, checkOut: true } },
        createdBy: { select: { id: true, name: true } },
        consumptions: {
          include: {
            booking: { select: { id: true, code: true } },
            usedBy: { select: { id: true, name: true } },
          },
          orderBy: { usedAt: "desc" },
        },
      },
    });
  }),

  getAvailableByHotel: proc.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.db.hotelCreditNote.findMany({
      where: {
        companyId: ctx.companyId,
        hotelId: input,
        status: { in: ["OPEN", "PARTIALLY_CONSUMED"] },
      },
      include: {
        currency: { select: { id: true, code: true, symbol: true } },
        sourceBooking: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  getByBooking: proc.input(z.string()).query(async ({ ctx, input }) => {
    const issued = await ctx.db.hotelCreditNote.findFirst({
      where: { sourceBookingId: input, companyId: ctx.companyId },
      include: {
        currency: { select: { id: true, code: true, symbol: true } },
        consumptions: {
          include: {
            booking: { select: { id: true, code: true } },
            usedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    const consumed = await ctx.db.hotelCreditConsumption.findMany({
      where: { bookingId: input },
      include: {
        creditNote: {
          include: {
            hotel: { select: { id: true, name: true } },
            currency: { select: { id: true, code: true, symbol: true } },
          },
        },
        usedBy: { select: { id: true, name: true } },
      },
      orderBy: { usedAt: "desc" },
    });

    return { issued, consumed };
  }),

  create: proc.input(hotelCreditCreateSchema).mutation(async ({ ctx, input }) => {
    const booking = await ctx.db.booking.findFirstOrThrow({
      where: { id: input.bookingId, companyId: ctx.companyId },
      select: {
        id: true,
        code: true,
        hotelId: true,
        currencyId: true,
        status: true,
      },
    });

    if (booking.status !== "CANCELLED") {
      throw new Error("Hotel credit notes can only be created for cancelled bookings.");
    }

    const existing = await ctx.db.hotelCreditNote.findUnique({
      where: { sourceBookingId: booking.id },
    });
    if (existing) {
      throw new Error("A credit note already exists for this booking.");
    }

    const code = await generateSequenceNumber(ctx.db, ctx.companyId, "hotel_credit");

    const creditNote = await ctx.db.hotelCreditNote.create({
      data: {
        companyId: ctx.companyId,
        code,
        hotelId: booking.hotelId,
        sourceBookingId: booking.id,
        amount: input.amount,
        remainingAmount: input.amount,
        currencyId: input.currencyId ?? booking.currencyId,
        notes: input.notes,
        status: "OPEN",
        createdById: ctx.session.user.id,
      },
    });

    await createHotelCreditFinanceRecord(
      ctx.db,
      ctx.companyId,
      {
        id: creditNote.id,
        hotelId: booking.hotelId,
        amount: input.amount,
        currencyId: input.currencyId ?? booking.currencyId,
        code,
        sourceBookingCode: booking.code,
      },
    ).catch(() => null);

    await logBookingAction(
      ctx.db,
      booking.id,
      "HOTEL_CREDIT_ISSUED",
      `Hotel credit note ${code} issued for ${input.amount}`,
      ctx.session.user.id,
    );

    return creditNote;
  }),

  consume: proc.input(hotelCreditApplySchema).mutation(async ({ ctx, input }) => {
    const creditNote = await ctx.db.hotelCreditNote.findFirstOrThrow({
      where: { id: input.creditNoteId, companyId: ctx.companyId },
      select: {
        id: true,
        code: true,
        hotelId: true,
        remainingAmount: true,
        status: true,
      },
    });

    if (creditNote.status === "CONSUMED" || creditNote.status === "CANCELLED") {
      throw new Error(`Credit note ${creditNote.code} is ${creditNote.status.toLowerCase()} and cannot be applied.`);
    }

    const remaining = Number(creditNote.remainingAmount);
    if (input.amountUsed > remaining) {
      throw new Error(
        `Amount exceeds remaining credit (${remaining}). Maximum applicable: ${remaining}.`,
      );
    }

    const booking = await ctx.db.booking.findFirstOrThrow({
      where: { id: input.bookingId, companyId: ctx.companyId },
      select: { id: true, code: true, hotelId: true, creditApplied: true },
    });

    if (booking.hotelId !== creditNote.hotelId) {
      throw new Error("Credit note is for a different hotel than this booking.");
    }

    await ctx.db.hotelCreditConsumption.create({
      data: {
        creditNoteId: input.creditNoteId,
        bookingId: input.bookingId,
        amountUsed: input.amountUsed,
        notes: input.notes,
        usedById: ctx.session.user.id,
      },
    });

    const newRemaining = remaining - input.amountUsed;
    const newStatus =
      newRemaining <= 0
        ? "CONSUMED"
        : "PARTIALLY_CONSUMED";

    await ctx.db.hotelCreditNote.update({
      where: { id: input.creditNoteId },
      data: {
        remainingAmount: newRemaining,
        status: newStatus,
      },
    });

    const newCreditApplied = Number(booking.creditApplied) + input.amountUsed;
    await ctx.db.booking.update({
      where: { id: input.bookingId },
      data: { creditApplied: newCreditApplied },
    });

    return { ok: true };
  }),

  cancel: proc.input(z.string()).mutation(async ({ ctx, input }) => {
    const creditNote = await ctx.db.hotelCreditNote.findFirstOrThrow({
      where: { id: input, companyId: ctx.companyId },
      select: { id: true, code: true, status: true },
    });

    if (creditNote.status !== "OPEN") {
      throw new Error(`Only OPEN credit notes can be cancelled. Current status: ${creditNote.status}.`);
    }

    const hasConsumptions = await ctx.db.hotelCreditConsumption.count({
      where: { creditNoteId: input },
    });
    if (hasConsumptions > 0) {
      throw new Error("Cannot cancel a credit note that has been partially consumed.");
    }

    return ctx.db.hotelCreditNote.update({
      where: { id: input },
      data: { status: "CANCELLED" },
    });
  }),
});
