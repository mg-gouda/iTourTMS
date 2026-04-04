import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { contactInquiryCreateSchema } from "@/lib/validations/b2c-site";
import { b2cRateLimit } from "@/server/b2c-rate-limit";

export async function POST(request: Request) {
  try {
    const rateLimited = await b2cRateLimit(request, "contact");
    if (rateLimited) return rateLimited;
    const body = await request.json();
    const parsed = contactInquiryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const company = await db.company.findFirst({ select: { id: true } });
    if (!company) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    await db.contactInquiry.create({
      data: {
        companyId: company.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        subject: parsed.data.subject ?? null,
        message: parsed.data.message,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
