import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import {
  extractEmailText,
  parseBookingEmail,
  resolveBookingEntities,
} from "@/server/services/reservations/email-parser";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — operator emails are text, not archives

/**
 * Turns a pasted or uploaded operator email into candidate booking fields.
 *
 * Off unless the company has stored an Anthropic API key. Nothing is written to
 * the database — the response only pre-fills the booking form, and the agent
 * confirms every field before saving.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;

    const permissions = session.user.permissions ?? [];
    const isSuperAdmin = (session.user.roles ?? []).includes("super_admin");
    if (!isSuperAdmin && !permissions.includes("reservations:booking:create")) {
      return NextResponse.json({ error: "Missing permission" }, { status: 403 });
    }

    const moduleInstalled = await db.installedModule.findFirst({
      where: { companyId, name: "reservations", isInstalled: true },
      select: { id: true },
    });
    if (!moduleInstalled) {
      return NextResponse.json({ error: "Reservations module is not installed" }, { status: 403 });
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { anthropicApiKey: true },
    });
    if (!company?.anthropicApiKey) {
      return NextResponse.json(
        { error: "AI email parsing is not enabled — add an Anthropic API key in Settings" },
        { status: 400 },
      );
    }

    // Accept either an uploaded file or pasted text
    let raw = "";
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "File is larger than 2 MB" }, { status: 400 });
      }
      raw = await file.text();
    } else {
      const body = (await req.json()) as { text?: string };
      raw = body.text ?? "";
      if (raw.length > MAX_BYTES) {
        return NextResponse.json({ error: "Text is larger than 2 MB" }, { status: 400 });
      }
    }

    const text = extractEmailText(raw);
    if (text.length < 20) {
      return NextResponse.json({ error: "Could not read any text from this email" }, { status: 400 });
    }

    const parsed = await parseBookingEmail(text, company.anthropicApiKey);
    const resolved = await resolveBookingEntities(db, companyId, parsed);

    // Email bodies are deliberately kept out of the logs
    return NextResponse.json(resolved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parsing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
