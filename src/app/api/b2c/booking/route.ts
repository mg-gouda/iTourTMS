import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";
import { sendBookingConfirmation } from "@/server/services/shared/email";

const guestSchema = z.object({
  title: z.string().default(""),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  isChild: z.boolean().default(false),
});

const bookingSchema = z.object({
  hotelId: z.string().min(1),
  roomTypeId: z.string().min(1),
  mealCode: z.string().min(1),
  contractId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  childAges: z.array(z.number().int().min(0)).default([]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  specialRequests: z.string().optional(),
  total: z.number().min(0),
  guests: z.array(guestSchema).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const {
      hotelId,
      roomTypeId,
      mealCode,
      contractId,
      checkIn,
      checkOut,
      adults,
      children,
      firstName,
      lastName,
      email,
      phone,
      specialRequests,
      total,
      guests,
    } = parsed.data;

    const company = await db.company.findFirst({ select: { id: true } });
    if (!company) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    // Compute nights
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
    );
    if (nights < 1) {
      return NextResponse.json(
        { error: "Check-out must be after check-in" },
        { status: 400 },
      );
    }

    // Generate booking code via Sequence
    const bookingCode = await generateSequenceNumber(db, company.id, "booking");

    // Get contract currency
    const contract = await db.contract.findFirst({
      where: { id: contractId },
      select: { baseCurrencyId: true },
    });
    const currencyId = contract?.baseCurrencyId ?? "";

    // Resolve mealBasisId from hotel + mealCode
    const mealBasis = await db.hotelMealBasis.findUnique({
      where: { hotelId_mealCode: { hotelId, mealCode: mealCode as any } },
      select: { id: true },
    });
    if (!mealBasis) {
      return NextResponse.json({ error: "Invalid meal plan" }, { status: 400 });
    }
    const resolvedMealBasisId = mealBasis.id;

    // Create booking
    const booking = await db.booking.create({
      data: {
        companyId: company.id,
        code: bookingCode,
        status: "NEW_BOOKING",
        source: "WEBSITE",
        hotelId,
        contractId,
        currencyId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        nights,
        adults,
        children,
        infants: 0,
        noOfRooms: 1,
        leadGuestName: `${firstName} ${lastName}`,
        leadGuestEmail: email,
        leadGuestPhone: phone || null,
        specialRequests: specialRequests || null,
        buyingTotal: total,
        sellingTotal: total,
        paymentStatus: "UNPAID",
        totalPaid: 0,
        balanceDue: total,
        manualRate: false,
        guestNames: guests && guests.length > 0
          ? guests.map((g, i) => ({
              title: g.title,
              name: `${g.firstName} ${g.lastName}`,
              type: i === 0 ? "LEAD" : g.isChild ? "CHILD" : "ADULT",
              roomIndex: 1,
            }))
          : [
              {
                title: "",
                name: `${firstName} ${lastName}`,
                type: "LEAD",
                roomIndex: 1,
              },
            ],
        rooms: {
          create: [
            {
              roomTypeId,
              mealBasisId: resolvedMealBasisId,
              roomIndex: 1,
              adults,
              children,
              extraBed: false,
              buyingRatePerNight: total / nights,
              buyingTotal: total,
              sellingRatePerNight: total / nights,
              sellingTotal: total,
            },
          ],
        },
      },
    });

    // Fetch hotel name and company info for email
    const [hotel, companyInfo] = await Promise.all([
      db.hotel.findFirst({ where: { id: hotelId }, select: { name: true } }),
      db.company.findFirst({ select: { name: true, email: true, phone: true } }),
    ]);

    // Send confirmation email (fire-and-forget)
    sendBookingConfirmation({
      to: email,
      guestName: `${firstName} ${lastName}`,
      bookingCode,
      hotelName: hotel?.name ?? "Hotel",
      checkIn,
      checkOut,
      nights,
      adults,
      children,
      total,
      companyName: companyInfo?.name ?? undefined,
      companyEmail: companyInfo?.email ?? undefined,
      companyPhone: companyInfo?.phone ?? undefined,
    }).catch((err) => console.error("[b2c/booking] Email error:", err));

    return NextResponse.json({
      success: true,
      bookingCode,
      bookingId: booking.id,
    });
  } catch (err) {
    console.error("[b2c/booking] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
