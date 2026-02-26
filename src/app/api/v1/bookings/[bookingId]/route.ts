import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiSuccess, apiError } from "@/server/api-response";
import { db } from "@/server/db";

/**
 * GET /api/v1/bookings/:bookingId — Get booking detail
 */
export const GET = withApiAuth(
  async (
    req: NextRequest,
    auth,
  ) => {
    const url = new URL(req.url);
    const bookingId = url.pathname.split("/").pop()!;

    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        companyId: auth.companyId,
        tourOperatorId: auth.tourOperatorId,
        hotelId: { in: auth.hotelIds },
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            phone: true,
            email: true,
            checkInTime: true,
            checkOutTime: true,
          },
        },
        contract: {
          select: { id: true, name: true, code: true },
        },
        currency: { select: { id: true, code: true, symbol: true } },
        rooms: {
          include: {
            roomType: { select: { id: true, name: true, code: true } },
            mealBasis: {
              select: { id: true, name: true, mealCode: true },
            },
            guests: {
              include: {
                guest: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    passportNo: true,
                    nationality: true,
                  },
                },
              },
            },
          },
          orderBy: { roomIndex: "asc" },
        },
        vouchers: {
          select: {
            id: true,
            code: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return apiError("NOT_FOUND", "Booking not found", 404);
    }

    return apiSuccess(booking);
  },
  "reservations:read",
);
