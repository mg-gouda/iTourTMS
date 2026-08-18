import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, partnerProcedure } from "@/server/trpc";

/**
 * The partner's own numbers.
 *
 * Every query is scoped by the session's tour operator, so there is no partner
 * id to pass and none to tamper with. Figures are net — what the partner pays
 * us — plus their own client price where it was recorded, because a report
 * that mixed the two would be worse than no report.
 */

const period = z.object({ from: z.date(), to: z.date() });

/** Bookings that count as production: anything not cancelled. */
const PRODUCTIVE = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "ON_REQUEST", "PENDING_APPROVAL"] as const;

const num = (v: Prisma.Decimal | number | null | undefined) => Number(v ?? 0);

export const partnerReportsRouter = createTRPCRouter({
  /** What was sold, grouped by hotel, with room nights and value. */
  production: partnerProcedure.input(period).query(async ({ ctx, input }) => {
    const bookings = await ctx.db.booking.findMany({
      where: {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        status: { in: [...PRODUCTIVE] },
        checkIn: { gte: input.from, lte: input.to },
      },
      select: {
        nights: true,
        noOfRooms: true,
        adults: true,
        children: true,
        buyingTotal: true,
        partnerClientPrice: true,
        hotel: { select: { id: true, name: true, city: true } },
        currency: { select: { code: true } },
      },
    });

    const byHotel = new Map<
      string,
      { hotel: string; city: string; bookings: number; roomNights: number; pax: number; net: number; client: number; currency: string }
    >();

    for (const b of bookings) {
      const key = b.hotel?.id ?? "unknown";
      const row = byHotel.get(key) ?? {
        hotel: b.hotel?.name ?? "—",
        city: b.hotel?.city ?? "—",
        bookings: 0,
        roomNights: 0,
        pax: 0,
        net: 0,
        client: 0,
        currency: b.currency?.code ?? "",
      };
      row.bookings += 1;
      row.roomNights += (b.nights ?? 0) * (b.noOfRooms ?? 1);
      row.pax += b.adults + b.children;
      row.net += num(b.buyingTotal);
      row.client += num(b.partnerClientPrice ?? b.buyingTotal);
      byHotel.set(key, row);
    }

    const rows = [...byHotel.values()].sort((a, b) => b.net - a.net);
    return {
      rows,
      totals: rows.reduce(
        (t, r) => ({
          bookings: t.bookings + r.bookings,
          roomNights: t.roomNights + r.roomNights,
          pax: t.pax + r.pax,
          net: t.net + r.net,
          client: t.client + r.client,
        }),
        { bookings: 0, roomNights: 0, pax: 0, net: 0, client: 0 },
      ),
    };
  }),

  /** Every booking in the period, one row each. */
  bookingList: partnerProcedure
    .input(period.extend({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.booking.findMany({
        where: {
          companyId: ctx.partner.companyId,
          tourOperatorId: ctx.partner.tourOperatorId,
          ...(input.status ? { status: input.status as never } : {}),
          checkIn: { gte: input.from, lte: input.to },
        },
        orderBy: { checkIn: "asc" },
        select: {
          id: true,
          code: true,
          status: true,
          partnerReference: true,
          checkIn: true,
          checkOut: true,
          nights: true,
          noOfRooms: true,
          adults: true,
          children: true,
          buyingTotal: true,
          partnerClientPrice: true,
          leadGuestFirstName: true,
          leadGuestLastName: true,
          hotel: { select: { name: true } },
          currency: { select: { code: true } },
        },
      });
    }),

  /** What was cancelled and what it cost. */
  cancellations: partnerProcedure.input(period).query(async ({ ctx, input }) => {
    const rows = await ctx.db.booking.findMany({
      where: {
        companyId: ctx.partner.companyId,
        tourOperatorId: ctx.partner.tourOperatorId,
        status: "CANCELLED",
        cancelledAt: { gte: input.from, lte: input.to },
      },
      orderBy: { cancelledAt: "desc" },
      select: {
        code: true,
        checkIn: true,
        cancelledAt: true,
        cancellationReason: true,
        buyingTotal: true,
        sourcePenaltyAmount: true,
        hotel: { select: { name: true } },
        currency: { select: { code: true } },
      },
    });

    return {
      rows,
      totals: {
        count: rows.length,
        value: rows.reduce((t, r) => t + num(r.buyingTotal), 0),
        penalties: rows.reduce((t, r) => t + num(r.sourcePenaltyAmount), 0),
      },
    };
  }),

  /** The money view: what was booked, what it cost, what was paid. */
  financialSummary: partnerProcedure.input(period).query(async ({ ctx, input }) => {
    const scope = {
      companyId: ctx.partner.companyId,
      tourOperatorId: ctx.partner.tourOperatorId,
    };

    const [booked, cancelled, movements, partner] = await Promise.all([
      ctx.db.booking.aggregate({
        where: { ...scope, status: { in: [...PRODUCTIVE] }, bookingDate: { gte: input.from, lte: input.to } },
        _sum: { buyingTotal: true, partnerClientPrice: true },
        _count: true,
      }),
      ctx.db.booking.aggregate({
        where: { ...scope, status: "CANCELLED", cancelledAt: { gte: input.from, lte: input.to } },
        _sum: { buyingTotal: true, sourcePenaltyAmount: true },
        _count: true,
      }),
      ctx.db.b2bCreditTransaction.groupBy({
        by: ["type"],
        where: { ...scope, createdAt: { gte: input.from, lte: input.to } },
        _sum: { amount: true },
      }),
      ctx.db.tourOperator.findUniqueOrThrow({
        where: { id: ctx.partner.tourOperatorId },
        select: { creditLimit: true, creditUsed: true },
      }),
    ]);

    const movement = (type: string) =>
      num(movements.find((m) => m.type === type)?._sum.amount);

    const net = num(booked._sum.buyingTotal);
    const client = num(booked._sum.partnerClientPrice);

    return {
      bookings: booked._count,
      net,
      clientPrice: client,
      // What the partner keeps: their own price less what they owe us.
      margin: client - net,
      cancellations: cancelled._count,
      cancelledValue: num(cancelled._sum.buyingTotal),
      penalties: num(cancelled._sum.sourcePenaltyAmount),
      charged: movement("BOOKING_CHARGE"),
      paid: movement("PAYMENT_RECEIVED"),
      creditNotes: movement("CREDIT_NOTE"),
      creditLimit: num(partner.creditLimit) > 0 ? num(partner.creditLimit) : null,
      creditUsed: num(partner.creditUsed),
    };
  }),
});
