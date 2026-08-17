import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { b2cRateLimit } from "@/server/b2c-rate-limit";

const emailSchema = z.string().email().max(254);

export async function GET(req: NextRequest) {
  const rateLimited = await b2cRateLimit(req, "myBookings");
  if (rateLimited) return rateLimited;

  const { searchParams } = req.nextUrl;
  const rawEmail = searchParams.get("email")?.trim().toLowerCase();
  const code = searchParams.get("code")?.trim().toUpperCase();

  const emailResult = emailSchema.safeParse(rawEmail);
  if (!emailResult.success) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  const email = emailResult.data;

  // The reference is REQUIRED. It used to be optional, which meant an email
  // address on its own returned that person's entire reservation history —
  // names, hotels, dates, prices — to anyone who typed it.
  if (!code) {
    return NextResponse.json(
      { error: "Booking reference is required" },
      { status: 400 },
    );
  }

  // This endpoint is unauthenticated, so it must never reach outside the
  // company that owns this public site.
  const company = await db.company.findFirst({ select: { id: true } });
  if (!company) {
    return NextResponse.json({ bookings: [] });
  }

  const bookings = await db.booking.findMany({
    where: {
      companyId: company.id,
      code,
      leadGuestEmail: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      code: true,
      status: true,
      checkIn: true,
      checkOut: true,
      nights: true,
      adults: true,
      children: true,
      leadGuestName: true,
      sellingTotal: true,
      paymentStatus: true,
      specialRequests: true,
      createdAt: true,
      hotel: { select: { id: true, name: true, starRating: true, city: true } },
      rooms: {
        select: {
          roomType: { select: { name: true } },
          mealBasis: { select: { name: true } },
          adults: true,
          children: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ bookings });
}
