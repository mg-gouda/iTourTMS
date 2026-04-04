import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { b2cRateLimit } from "@/server/b2c-rate-limit";

const activityEnquirySchema = z.object({
  excursionId: z.string().min(1),
  date: z.string().date(),
  adults: z.number().int().min(1).max(50),
  children: z.number().int().min(0).max(20).default(0),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimited = await b2cRateLimit(request, "activity-enquiry");
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = activityEnquirySchema.safeParse(body);

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

    // Fetch excursion name
    const excursion = await db.crmExcursion.findFirst({
      where: { id: data.excursionId, companyId: company.id },
      select: { name: true, code: true },
    });

    const excName = excursion ? `${excursion.name} (${excursion.code})` : data.excursionId;

    // Store as contact inquiry
    const inquiry = await db.contactInquiry.create({
      data: {
        companyId: company.id,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone ?? null,
        subject: `Activity Booking: ${excName} — ${data.date}`,
        message: [
          `Activity: ${excName}`,
          `Date: ${data.date}`,
          `Adults: ${data.adults}`,
          data.children > 0 ? `Children: ${data.children}` : null,
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
      message: "Your booking enquiry has been submitted. We will confirm availability and contact you shortly.",
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
