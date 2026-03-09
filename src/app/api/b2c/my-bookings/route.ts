import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const email = searchParams.get("email")?.trim().toLowerCase();
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Build where clause
  const where: Record<string, unknown> = {
    leadGuestEmail: { equals: email, mode: "insensitive" },
  };
  if (code) {
    where.code = code;
  }

  const bookings = await db.booking.findMany({
    where,
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
