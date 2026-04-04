import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { b2cRateLimit } from "@/server/b2c-rate-limit";

const transferEnquirySchema = z.object({
  type: z.enum(["ARR", "DEP", "ARR_DEP"]),
  airportId: z.string().min(1),
  hotelName: z.string().min(1),
  date: z.string().date(),
  flightNo: z.string().optional(),
  flightTime: z.string().optional(),
  passengers: z.number().int().min(1).max(50),
  vehicleTypeId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimited = await b2cRateLimit(request, "transfer-enquiry");
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = transferEnquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const company = await db.company.findFirst({ select: { id: true } });
    if (!company) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    // Store as a contact inquiry with transfer-specific metadata
    const inquiry = await db.contactInquiry.create({
      data: {
        companyId: company.id,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone ?? null,
        subject: `Transfer Enquiry: ${data.type === "ARR" ? "Arrival" : data.type === "DEP" ? "Departure" : "Return"} — ${data.date}`,
        message: [
          `Type: ${data.type}`,
          `Airport: ${data.airportId}`,
          `Hotel: ${data.hotelName}`,
          `Date: ${data.date}`,
          data.flightNo ? `Flight: ${data.flightNo}` : null,
          data.flightTime ? `Time: ${data.flightTime}` : null,
          `Passengers: ${data.passengers}`,
          data.vehicleTypeId ? `Vehicle preference: ${data.vehicleTypeId}` : null,
          data.notes ? `Notes: ${data.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        status: "NEW",
      },
    });

    return NextResponse.json({
      success: true,
      enquiryId: inquiry.id,
      message: "Your transfer enquiry has been submitted. We will contact you shortly.",
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
