import type { NextRequest } from "next/server";

import { withApiAuth } from "@/server/api-middleware";
import { apiError, apiSuccess } from "@/server/api-response";
import { db } from "@/server/db";

export const GET = withApiAuth(async (req: NextRequest, auth) => {
  const hotelId = req.nextUrl.pathname.split("/")[4]!;

  if (!auth.hotelIds.includes(hotelId)) {
    return apiError("NOT_FOUND", "Hotel not found", 404);
  }

  const hotel = await db.hotel.findFirst({
    where: { id: hotelId, companyId: auth.companyId },
    select: {
      id: true,
      name: true,
      code: true,
      starRating: true,
      chainName: true,
      description: true,
      shortDescription: true,
      address: true,
      city: true,
      zipCode: true,
      latitude: true,
      longitude: true,
      phone: true,
      fax: true,
      email: true,
      website: true,
      reservationEmail: true,
      contactPerson: true,
      checkInTime: true,
      checkOutTime: true,
      totalRooms: true,
      yearBuilt: true,
      yearRenovated: true,
      country: { select: { id: true, name: true, code: true } },
      destination: { select: { id: true, name: true } },
      cityRel: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      roomTypes: {
        select: {
          id: true,
          name: true,
          code: true,
          maxAdults: true,
          maxChildren: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      amenities: {
        select: { id: true, name: true, category: true, icon: true },
      },
      mealBasis: {
        select: {
          id: true,
          name: true,
          mealCode: true,
        },
      },
    },
  });

  if (!hotel) {
    return apiError("NOT_FOUND", "Hotel not found", 404);
  }

  return apiSuccess(hotel);
});
