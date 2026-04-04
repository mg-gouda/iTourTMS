import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { newsletterSubscribeSchema } from "@/lib/validations/b2c-site";
import { b2cRateLimit } from "@/server/b2c-rate-limit";

export async function POST(request: Request) {
  try {
    const rateLimited = await b2cRateLimit(request, "newsletter");
    if (rateLimited) return rateLimited;
    const body = await request.json().catch(() => null);

    // Also support form data (from the homepage form)
    let email: string | undefined;
    if (body?.email) {
      email = body.email;
    } else {
      const formData = await request.formData().catch(() => null);
      email = formData?.get("email")?.toString();
    }

    const parsed = newsletterSubscribeSchema.safeParse({ email });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const company = await db.company.findFirst({ select: { id: true } });
    if (!company) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    await db.newsletterSubscriber.upsert({
      where: {
        companyId_email: { companyId: company.id, email: parsed.data.email },
      },
      create: {
        companyId: company.id,
        email: parsed.data.email,
      },
      update: {
        active: true,
        unsubscribedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
