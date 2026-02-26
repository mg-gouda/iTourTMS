import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiPaginated, apiSuccess, apiError } from "@/server/api-response";
import { db } from "@/server/db";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";
import {
  calculateBookingRates,
  computeNights,
} from "@/server/services/reservations/booking-engine";
import { logBookingAction } from "@/server/services/reservations/timeline-logger";
import { dispatchWebhooks } from "@/server/services/contracting/webhook-dispatcher";

/**
 * GET /api/v1/bookings — List bookings for the authenticated tour operator
 */
export const GET = withApiAuth(async (req: NextRequest, auth) => {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
  const status = url.searchParams.get("status") ?? undefined;
  const hotelId = url.searchParams.get("hotelId") ?? undefined;

  const where: Record<string, unknown> = {
    companyId: auth.companyId,
    tourOperatorId: auth.tourOperatorId,
  };

  if (hotelId) {
    if (!auth.hotelIds.includes(hotelId)) {
      return apiError("FORBIDDEN", "Access denied to this hotel", 403);
    }
    where.hotelId = hotelId;
  } else {
    where.hotelId = { in: auth.hotelIds };
  }

  if (status) where.status = status;

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      select: {
        id: true,
        code: true,
        status: true,
        source: true,
        paymentStatus: true,
        checkIn: true,
        checkOut: true,
        nights: true,
        leadGuestName: true,
        sellingTotal: true,
        buyingTotal: true,
        externalRef: true,
        createdAt: true,
        hotel: { select: { id: true, name: true, code: true } },
        currency: { select: { code: true, symbol: true } },
        _count: { select: { rooms: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.booking.count({ where }),
  ]);

  return apiPaginated(bookings, total, page, pageSize);
}, "reservations:read");

/**
 * POST /api/v1/bookings — Create a booking via API
 */
export const POST = withApiAuth(async (req: NextRequest, auth) => {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const {
    hotelId,
    contractId,
    checkIn,
    checkOut,
    rooms,
    leadGuestName,
    leadGuestEmail,
    leadGuestPhone,
    externalRef,
    specialRequests,
    currencyId,
    manualRate,
  } = body as {
    hotelId: string;
    contractId?: string;
    checkIn: string;
    checkOut: string;
    rooms: Array<{
      roomTypeId: string;
      mealBasisId: string;
      adults: number;
      children?: number;
      extraBed?: boolean;
      buyingRatePerNight?: number;
      sellingRatePerNight?: number;
    }>;
    leadGuestName?: string;
    leadGuestEmail?: string;
    leadGuestPhone?: string;
    externalRef?: string;
    specialRequests?: string;
    currencyId?: string;
    manualRate?: boolean;
  };

  // Validate required fields
  if (!hotelId || !checkIn || !checkOut || !rooms?.length) {
    return apiError(
      "BAD_REQUEST",
      "Missing required fields: hotelId, checkIn, checkOut, rooms",
      400,
    );
  }

  // Verify hotel access
  if (!auth.hotelIds.includes(hotelId)) {
    return apiError("FORBIDDEN", "Access denied to this hotel", 403);
  }

  // Validate dates
  if (checkOut <= checkIn) {
    return apiError("BAD_REQUEST", "checkOut must be after checkIn", 400);
  }

  const nights = computeNights(checkIn, checkOut);
  const code = await generateSequenceNumber(db, auth.companyId, "booking");

  let buyingTotal = 0;
  let sellingTotal = 0;
  let seasonId: string | null = null;
  let markupRuleId: string | null = null;
  let markupType: string | null = null;
  let markupValue: number | null = null;
  let markupAmount = 0;
  let rateBasis: string | null = null;
  let resolvedCurrencyId = currencyId ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomsData: any[] = [];

  if (!manualRate && contractId) {
    try {
      const rateResult = await calculateBookingRates(db, auth.companyId, {
        contractId,
        hotelId,
        tourOperatorId: auth.tourOperatorId,
        checkIn,
        checkOut,
        rooms: rooms.map((r) => ({
          roomTypeId: r.roomTypeId,
          mealBasisId: r.mealBasisId,
          adults: r.adults,
          children: [],
          extraBed: r.extraBed ?? false,
        })),
      });

      buyingTotal = rateResult.buyingTotal;
      sellingTotal = rateResult.sellingTotal;
      seasonId = rateResult.seasonId;
      markupRuleId = rateResult.markupRuleId;
      markupType = rateResult.markupType;
      markupValue = rateResult.markupValue;
      markupAmount = rateResult.markupAmount;
      resolvedCurrencyId = rateResult.currencyId;

      const contract = await db.contract.findFirst({
        where: { id: contractId },
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
        });
      }
    } catch (err) {
      return apiError(
        "RATE_CALCULATION_ERROR",
        err instanceof Error ? err.message : "Failed to calculate rates",
        422,
      );
    }
  } else {
    // Manual rates
    if (!resolvedCurrencyId) {
      return apiError("BAD_REQUEST", "currencyId is required for manual rates", 400);
    }
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i]!;
      const buyPerNight = r.buyingRatePerNight ?? 0;
      const sellPerNight = r.sellingRatePerNight ?? 0;
      buyingTotal += buyPerNight * nights;
      sellingTotal += sellPerNight * nights;

      roomsData.push({
        roomTypeId: r.roomTypeId,
        mealBasisId: r.mealBasisId,
        roomIndex: i + 1,
        adults: r.adults,
        children: r.children ?? 0,
        extraBed: r.extraBed ?? false,
        buyingRatePerNight: buyPerNight,
        buyingTotal: buyPerNight * nights,
        sellingRatePerNight: sellPerNight,
        sellingTotal: sellPerNight * nights,
        rateBreakdown: null,
      });
    }
  }

  const booking = await db.booking.create({
    data: {
      companyId: auth.companyId,
      code,
      status: "DRAFT",
      source: "API",
      hotelId,
      contractId: contractId ?? null,
      tourOperatorId: auth.tourOperatorId,
      seasonId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      nights,
      currencyId: resolvedCurrencyId,
      rateBasis,
      buyingTotal,
      sellingTotal,
      manualRate: manualRate ?? false,
      markupRuleId,
      markupType,
      markupValue,
      markupAmount,
      paymentStatus: "UNPAID",
      totalPaid: 0,
      balanceDue: sellingTotal,
      leadGuestName: (leadGuestName as string) ?? null,
      leadGuestEmail: (leadGuestEmail as string) ?? null,
      leadGuestPhone: (leadGuestPhone as string) ?? null,
      specialRequests: (specialRequests as string) ?? null,
      externalRef: (externalRef as string) ?? null,
      apiIntegrationId: auth.integrationId,
      rooms: { create: roomsData },
    },
    include: {
      hotel: { select: { id: true, name: true, code: true } },
      rooms: {
        include: {
          roomType: { select: { id: true, name: true } },
          mealBasis: { select: { id: true, name: true, mealCode: true } },
        },
      },
      currency: { select: { code: true, symbol: true } },
    },
  });

  await logBookingAction(db, booking.id, "CREATED", `API booking ${code} created`, null);

  // Dispatch webhook
  dispatchWebhooks(auth.companyId, hotelId, "booking.created", {
    bookingId: booking.id,
    bookingCode: booking.code,
    hotelId: booking.hotelId,
    checkIn: booking.checkIn.toISOString(),
    checkOut: booking.checkOut.toISOString(),
    nights: booking.nights,
    sellingTotal: Number(booking.sellingTotal),
    source: booking.source,
  });

  return apiSuccess(booking, 201);
}, "reservations:write");
