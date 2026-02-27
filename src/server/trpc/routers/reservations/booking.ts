import { z } from "zod";

import {
  bookingCreateSchema,
  bookingUpdateSchema,
  bookingStatusTransitionSchema,
  bookingRateCalcSchema,
} from "@/lib/validations/reservations";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";
import {
  calculateBookingRates,
  checkAvailability,
  computeNights,
  deductAllotment,
  restoreAllotment,
} from "@/server/services/reservations/booking-engine";
import { logBookingAction } from "@/server/services/reservations/timeline-logger";
import { dispatchWebhooks } from "@/server/services/contracting/webhook-dispatcher";

const proc = moduleProcedure("reservations");

export const bookingRouter = createTRPCRouter({
  // ── List with filters ──
  list: proc
    .input(
      z
        .object({
          status: z.enum(["DRAFT", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]).optional(),
          hotelId: z.string().optional(),
          tourOperatorId: z.string().optional(),
          source: z.enum(["DIRECT", "TOUR_OPERATOR", "API"]).optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { companyId: ctx.companyId };

      if (input?.status) where.status = input.status;
      if (input?.hotelId) where.hotelId = input.hotelId;
      if (input?.tourOperatorId) where.tourOperatorId = input.tourOperatorId;
      if (input?.source) where.source = input.source;
      if (input?.dateFrom) where.checkIn = { gte: new Date(input.dateFrom) };
      if (input?.dateTo) {
        where.checkOut = { ...(where.checkOut as object ?? {}), lte: new Date(input.dateTo) };
      }
      if (input?.search) {
        where.OR = [
          { code: { contains: input.search, mode: "insensitive" } },
          { leadGuestName: { contains: input.search, mode: "insensitive" } },
          { externalRef: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return ctx.db.booking.findMany({
        where,
        include: {
          hotel: { select: { id: true, name: true, code: true } },
          tourOperator: { select: { id: true, name: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          _count: { select: { rooms: true, payments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // ── Get by ID (full detail) ──
  getById: proc
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.booking.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          hotel: { select: { id: true, name: true, code: true, address: true, phone: true, email: true, checkInTime: true, checkOutTime: true } },
          contract: { select: { id: true, name: true, code: true, validFrom: true, validTo: true } },
          tourOperator: { select: { id: true, name: true, code: true } },
          season: { select: { id: true, dateFrom: true, dateTo: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          markupRule: { select: { id: true, name: true, markupType: true, value: true } },
          createdBy: { select: { id: true, name: true } },
          confirmedBy: { select: { id: true, name: true } },
          cancelledBy: { select: { id: true, name: true } },
          checkedInBy: { select: { id: true, name: true } },
          checkedOutBy: { select: { id: true, name: true } },
          rooms: {
            include: {
              roomType: { select: { id: true, name: true, code: true } },
              mealBasis: { select: { id: true, name: true, mealCode: true } },
              guests: {
                include: {
                  guest: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true, passportNo: true, nationality: true },
                  },
                },
              },
            },
            orderBy: { roomIndex: "asc" },
          },
          payments: {
            include: {
              currency: { select: { id: true, code: true, symbol: true } },
              createdBy: { select: { id: true, name: true } },
            },
            orderBy: { paidAt: "desc" },
          },
          vouchers: {
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
          timeline: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }),

  // ── Create booking ──
  create: proc
    .input(bookingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const nights = computeNights(input.checkIn, input.checkOut);

      // Generate booking code
      const code = await generateSequenceNumber(ctx.db, ctx.companyId, "booking");

      let buyingTotal = 0;
      let sellingTotal = 0;
      let seasonId: string | null = null;
      let markupRuleId: string | null = null;
      let markupType: string | null = null;
      let markupValue: number | null = null;
      let markupAmount = 0;
      let rateBasis: string | null = null;
      let currencyId = input.currencyId;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roomsData: any[] = [];

      if (!input.manualRate && input.contractId) {
        // Calculate rates from contract
        const rateResult = await calculateBookingRates(ctx.db, ctx.companyId, {
          contractId: input.contractId,
          hotelId: input.hotelId,
          tourOperatorId: input.tourOperatorId ?? null,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          bookingDate: new Date().toISOString().slice(0, 10),
          rooms: input.rooms.map((r) => ({
            roomTypeId: r.roomTypeId,
            mealBasisId: r.mealBasisId,
            adults: r.adults,
            children: [],
            extraBed: r.extraBed,
          })),
        });

        buyingTotal = rateResult.buyingTotal;
        sellingTotal = rateResult.sellingTotal;
        seasonId = rateResult.seasonId;
        markupRuleId = rateResult.markupRuleId;
        markupType = rateResult.markupType;
        markupValue = rateResult.markupValue;
        markupAmount = rateResult.markupAmount;
        currencyId = rateResult.currencyId;

        // Get contract rate basis
        const contract = await ctx.db.contract.findFirst({
          where: { id: input.contractId },
          select: { rateBasis: true },
        });
        rateBasis = contract?.rateBasis ?? null;

        for (const rr of rateResult.rooms) {
          roomsData.push({
            roomTypeId: rr.roomTypeId,
            mealBasisId: rr.mealBasisId,
            roomIndex: rr.roomIndex,
            adults: rr.adults,
            children: rr.children.length,
            extraBed: rr.extraBed,
            buyingRatePerNight: rr.buyingRatePerNight,
            buyingTotal: rr.buyingTotal,
            sellingRatePerNight: rr.sellingRatePerNight,
            sellingTotal: rr.sellingTotal,
            rateBreakdown: rr.breakdown,
            specialRequests: input.rooms[rr.roomIndex - 1]?.specialRequests ?? null,
          });
        }
      } else {
        // Manual rate mode
        for (let i = 0; i < input.rooms.length; i++) {
          const r = input.rooms[i]!;
          const buyPerNight = r.buyingRatePerNight ?? 0;
          const sellPerNight = r.sellingRatePerNight ?? 0;
          const buyTotal = buyPerNight * nights;
          const sellTotal = sellPerNight * nights;
          buyingTotal += buyTotal;
          sellingTotal += sellTotal;

          roomsData.push({
            roomTypeId: r.roomTypeId,
            mealBasisId: r.mealBasisId,
            roomIndex: i + 1,
            adults: r.adults,
            children: r.children,
            extraBed: r.extraBed,
            buyingRatePerNight: buyPerNight,
            buyingTotal: buyTotal,
            sellingRatePerNight: sellPerNight,
            sellingTotal: sellTotal,
            rateBreakdown: null,
            specialRequests: r.specialRequests ?? null,
          });
        }
      }

      // Determine source
      let source = input.source;
      if (input.tourOperatorId && source === "DIRECT") {
        source = "TOUR_OPERATOR";
      }

      const booking = await ctx.db.booking.create({
        data: {
          companyId: ctx.companyId,
          code,
          status: "DRAFT",
          source,
          hotelId: input.hotelId,
          contractId: input.contractId ?? null,
          tourOperatorId: input.tourOperatorId ?? null,
          seasonId,
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          nights,
          currencyId,
          rateBasis,
          buyingTotal,
          sellingTotal,
          manualRate: input.manualRate,
          markupRuleId,
          markupType,
          markupValue,
          markupAmount,
          paymentStatus: "UNPAID",
          totalPaid: 0,
          balanceDue: sellingTotal,

          // Partner booking statuses
          htlBookingStatus: input.htlBookingStatus ?? null,
          toBookingStatus: input.toBookingStatus ?? null,

          // Flight — Arrival
          arrivalFlightNo: input.arrivalFlightNo ?? null,
          arrivalTime: input.arrivalTime ?? null,
          arrivalOriginApt: input.arrivalOriginApt ?? null,
          arrivalDestApt: input.arrivalDestApt ?? null,
          arrivalTerminal: input.arrivalTerminal ?? null,

          // Flight — Departure
          departFlightNo: input.departFlightNo ?? null,
          departTime: input.departTime ?? null,
          departOriginApt: input.departOriginApt ?? null,
          departDestApt: input.departDestApt ?? null,
          departTerminal: input.departTerminal ?? null,

          // Room summary
          roomOccupancy: input.roomOccupancy ?? null,
          noOfRooms: input.noOfRooms ?? 1,
          adults: input.adults ?? 2,
          children: input.children ?? 0,
          infants: input.infants ?? 0,

          // Guest names
          guestNames: input.guestNames?.length ? input.guestNames : undefined,

          // Child DOBs
          childDob1: input.childDob1 ? new Date(input.childDob1) : null,
          childDob2: input.childDob2 ? new Date(input.childDob2) : null,

          // Hotel payment
          hotelPaymentMethod: input.hotelPaymentMethod ?? null,
          paymentOptionDate: input.paymentOptionDate ? new Date(input.paymentOptionDate) : null,

          // Misc
          leadGuestName: input.leadGuestName ?? null,
          leadGuestEmail: input.leadGuestEmail ?? null,
          leadGuestPhone: input.leadGuestPhone ?? null,
          specialRequests: input.specialRequests ?? null,
          internalNotes: input.internalNotes ?? null,
          externalRef: input.externalRef ?? null,
          bookingNotes: input.bookingNotes ?? null,
          meetAssistVisa: input.meetAssistVisa ?? false,
          createdById: ctx.session.user.id,
          rooms: {
            create: roomsData,
          },
        },
        include: {
          rooms: true,
        },
      });

      // Assign guests to rooms if provided
      for (const roomInput of input.rooms) {
        if (roomInput.guests && roomInput.guests.length > 0) {
          const createdRoom = booking.rooms.find(
            (r) => r.roomTypeId === roomInput.roomTypeId && r.mealBasisId === roomInput.mealBasisId,
          );
          if (createdRoom) {
            await ctx.db.bookingGuest.createMany({
              data: roomInput.guests.map((g) => ({
                bookingId: booking.id,
                bookingRoomId: createdRoom.id,
                guestId: g.guestId,
                guestType: g.guestType as "LEAD" | "ADDITIONAL" | "CHILD",
                isLeadGuest: g.isLeadGuest,
                childCategory: g.childCategory ?? null,
                childAge: g.childAge ?? null,
              })),
            });
          }
        }
      }

      // Log creation
      await logBookingAction(ctx.db, booking.id, "CREATED", `Booking ${code} created`, ctx.session.user.id);

      return booking;
    }),

  // ── Update booking (DRAFT only) ──
  update: proc
    .input(z.object({ id: z.string(), data: bookingUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        select: { id: true, status: true },
      });

      if (booking.status !== "DRAFT") {
        throw new Error("Only draft bookings can be edited");
      }

      const data: Record<string, unknown> = {};
      if (input.data.checkIn) data.checkIn = new Date(input.data.checkIn);
      if (input.data.checkOut) data.checkOut = new Date(input.data.checkOut);
      if (input.data.checkIn && input.data.checkOut) {
        data.nights = computeNights(input.data.checkIn, input.data.checkOut);
      }
      if (input.data.specialRequests !== undefined) data.specialRequests = input.data.specialRequests;
      if (input.data.internalNotes !== undefined) data.internalNotes = input.data.internalNotes;
      if (input.data.externalRef !== undefined) data.externalRef = input.data.externalRef;
      if (input.data.leadGuestName !== undefined) data.leadGuestName = input.data.leadGuestName;
      if (input.data.leadGuestEmail !== undefined) data.leadGuestEmail = input.data.leadGuestEmail;
      if (input.data.leadGuestPhone !== undefined) data.leadGuestPhone = input.data.leadGuestPhone;

      return ctx.db.booking.update({
        where: { id: input.id },
        data,
      });
    }),

  // ── Delete booking (DRAFT only) ──
  delete: proc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirstOrThrow({
        where: { id: input.id, companyId: ctx.companyId },
        select: { id: true, status: true },
      });

      if (booking.status !== "DRAFT") {
        throw new Error("Only draft bookings can be deleted");
      }

      return ctx.db.booking.delete({ where: { id: input.id } });
    }),

  // ── Status transitions ──
  transition: proc
    .input(bookingStatusTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirstOrThrow({
        where: { id: input.bookingId, companyId: ctx.companyId },
        include: { rooms: { select: { roomTypeId: true } } },
      });

      const now = new Date();
      const userId = ctx.session.user.id;

      switch (input.action) {
        case "confirm": {
          if (booking.status !== "DRAFT") throw new Error("Only draft bookings can be confirmed");

          // Check availability and deduct allotment
          if (booking.contractId) {
            const roomTypeIds = booking.rooms.map((r) => r.roomTypeId);
            const availability = await checkAvailability(
              ctx.db,
              booking.contractId,
              booking.checkIn.toISOString().slice(0, 10),
              booking.checkOut.toISOString().slice(0, 10),
              roomTypeIds,
            );
            if (!availability.available) {
              throw new Error(`Booking cannot be confirmed: ${availability.warnings.join(", ")}`);
            }
            await deductAllotment(ctx.db, booking.contractId, roomTypeIds);
          }

          // Auto-generate voucher
          const voucherCode = await generateSequenceNumber(ctx.db, ctx.companyId, "voucher");
          await ctx.db.voucher.create({
            data: {
              companyId: ctx.companyId,
              code: voucherCode,
              bookingId: booking.id,
              createdById: userId,
            },
          });

          const updated = await ctx.db.booking.update({
            where: { id: booking.id },
            data: { status: "CONFIRMED", confirmedAt: now, confirmedById: userId },
          });

          await logBookingAction(ctx.db, booking.id, "CONFIRMED", `Booking confirmed. Voucher ${voucherCode} issued.`, userId);
          dispatchWebhooks(ctx.companyId, booking.hotelId, "booking.confirmed", {
            bookingId: booking.id, bookingCode: booking.code, hotelId: booking.hotelId,
          });
          return updated;
        }

        case "cancel": {
          if (booking.status === "CHECKED_OUT" || booking.status === "CANCELLED") {
            throw new Error("Cannot cancel this booking");
          }

          // Restore allotment if was confirmed
          if (booking.contractId && (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN")) {
            const roomTypeIds = booking.rooms.map((r) => r.roomTypeId);
            await restoreAllotment(ctx.db, booking.contractId, roomTypeIds);
          }

          const updated = await ctx.db.booking.update({
            where: { id: booking.id },
            data: {
              status: "CANCELLED",
              cancelledAt: now,
              cancelledById: userId,
              cancellationReason: input.reason ?? null,
            },
          });

          await logBookingAction(ctx.db, booking.id, "CANCELLED", input.reason ?? "Booking cancelled", userId);
          dispatchWebhooks(ctx.companyId, booking.hotelId, "booking.cancelled", {
            bookingId: booking.id, bookingCode: booking.code, hotelId: booking.hotelId,
            reason: input.reason ?? null,
          });
          return updated;
        }

        case "check_in": {
          if (booking.status !== "CONFIRMED") throw new Error("Only confirmed bookings can be checked in");

          const updated = await ctx.db.booking.update({
            where: { id: booking.id },
            data: { status: "CHECKED_IN", checkedInAt: now, checkedInById: userId },
          });

          await logBookingAction(ctx.db, booking.id, "CHECKED_IN", "Guest checked in", userId);
          dispatchWebhooks(ctx.companyId, booking.hotelId, "booking.checked_in", {
            bookingId: booking.id, bookingCode: booking.code, hotelId: booking.hotelId,
          });
          return updated;
        }

        case "check_out": {
          if (booking.status !== "CHECKED_IN") throw new Error("Only checked-in bookings can be checked out");

          const updated = await ctx.db.booking.update({
            where: { id: booking.id },
            data: { status: "CHECKED_OUT", checkedOutAt: now, checkedOutById: userId },
          });

          await logBookingAction(ctx.db, booking.id, "CHECKED_OUT", "Guest checked out", userId);
          dispatchWebhooks(ctx.companyId, booking.hotelId, "booking.checked_out", {
            bookingId: booking.id, bookingCode: booking.code, hotelId: booking.hotelId,
          });
          return updated;
        }

        case "no_show": {
          if (booking.status !== "CONFIRMED") throw new Error("Only confirmed bookings can be marked as no-show");

          // Restore allotment
          if (booking.contractId) {
            const roomTypeIds = booking.rooms.map((r) => r.roomTypeId);
            await restoreAllotment(ctx.db, booking.contractId, roomTypeIds);
          }

          const updated = await ctx.db.booking.update({
            where: { id: booking.id },
            data: { status: "NO_SHOW" },
          });

          await logBookingAction(ctx.db, booking.id, "STATUS_CHANGED", "Marked as no-show", userId);
          return updated;
        }

        default:
          throw new Error("Invalid action");
      }
    }),

  // ── Calculate rates preview ──
  calculateRates: proc
    .input(bookingRateCalcSchema)
    .query(async ({ ctx, input }) => {
      return calculateBookingRates(ctx.db, ctx.companyId, {
        contractId: input.contractId,
        hotelId: input.hotelId,
        tourOperatorId: input.tourOperatorId ?? null,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        bookingDate: input.bookingDate ?? new Date().toISOString().slice(0, 10),
        rooms: input.rooms.map((r) => ({
          roomTypeId: r.roomTypeId,
          mealBasisId: r.mealBasisId,
          adults: r.adults,
          children: r.children,
          extraBed: r.extraBed,
        })),
      });
    }),

  // ── Dashboard KPIs ──
  dashboard: proc.query(async ({ ctx }) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekFromNow = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [
      totalByStatus,
      confirmedToday,
      upcomingCheckIns,
      monthRevenue,
      recentBookings,
      bookingsByHotel,
    ] = await Promise.all([
      ctx.db.booking.groupBy({
        by: ["status"],
        where: { companyId: ctx.companyId },
        _count: true,
      }),
      ctx.db.booking.count({
        where: {
          companyId: ctx.companyId,
          status: "CONFIRMED",
          confirmedAt: { gte: new Date(today), lt: new Date(new Date(today).getTime() + 86_400_000) },
        },
      }),
      ctx.db.booking.count({
        where: {
          companyId: ctx.companyId,
          status: "CONFIRMED",
          checkIn: { gte: new Date(today), lte: new Date(weekFromNow) },
        },
      }),
      ctx.db.booking.aggregate({
        where: {
          companyId: ctx.companyId,
          status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
          createdAt: { gte: new Date(monthStart) },
        },
        _sum: { sellingTotal: true, buyingTotal: true },
      }),
      ctx.db.booking.findMany({
        where: { companyId: ctx.companyId },
        include: {
          hotel: { select: { id: true, name: true } },
          currency: { select: { code: true, symbol: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      ctx.db.booking.groupBy({
        by: ["hotelId"],
        where: {
          companyId: ctx.companyId,
          status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        },
        _count: true,
        orderBy: { _count: { hotelId: "desc" } },
        take: 8,
      }),
    ]);

    // Resolve hotel names for bookingsByHotel
    const hotelIds = bookingsByHotel.map((b) => b.hotelId);
    const hotels = await ctx.db.hotel.findMany({
      where: { id: { in: hotelIds } },
      select: { id: true, name: true },
    });
    const hotelMap = new Map(hotels.map((h) => [h.id, h.name]));

    return {
      totalByStatus: Object.fromEntries(totalByStatus.map((s) => [s.status, s._count])),
      confirmedToday,
      upcomingCheckIns,
      monthRevenue: {
        selling: Number(monthRevenue._sum.sellingTotal ?? 0),
        buying: Number(monthRevenue._sum.buyingTotal ?? 0),
      },
      recentBookings,
      bookingsByHotel: bookingsByHotel.map((b) => ({
        hotelId: b.hotelId,
        hotelName: hotelMap.get(b.hotelId) ?? "Unknown",
        count: b._count,
      })),
    };
  }),
});
