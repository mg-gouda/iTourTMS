import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";

/**
 * The hotel's SPO (special offer) document for one booking. Stored in the
 * database, never under public/uploads: offers are commercial terms.
 * GET downloads it, POST (multipart "file") replaces it, DELETE removes it.
 */

const MAX = 10 * 1024 * 1024;

/** Type from the bytes, not from what the browser claims. */
function sniff(b: Buffer): { mime: string; ext: string } | null {
  if (b.subarray(0, 4).toString("latin1") === "%PDF") return { mime: "application/pdf", ext: "pdf" };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return { mime: "image/webp", ext: "webp" };
  // .docx is a zip; check it carries a Word part rather than accepting any zip.
  if (b[0] === 0x50 && b[1] === 0x4b && b.includes(Buffer.from("word/"))) {
    return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
  }
  return null;
}

async function guard(id: string, need: "read" | "update") {
  const session = await auth();
  const user = session?.user;
  if (!user?.companyId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const ok = user.roles?.includes("super_admin") || user.permissions?.includes(`reservations:booking:${need}`);
  if (!ok) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const booking = await db.booking.findFirst({ where: { id, companyId: user.companyId }, select: { id: true, code: true } });
  if (!booking) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { user, booking };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard((await params).id, "read");
  if ("error" in g) return g.error;
  const doc = await db.bookingDocument.findUnique({ where: { bookingId_kind: { bookingId: g.booking.id, kind: "SPO" } } });
  if (!doc) return NextResponse.json({ error: "No SPO document" }, { status: 404 });
  const name = doc.fileName.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(new Uint8Array(doc.data), {
    headers: {
      "content-type": doc.mimeType,
      "content-length": String(doc.size),
      "content-disposition": `attachment; filename="${name}"`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard((await params).id, "update");
  if ("error" in g) return g.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File is over 10 MB" }, { status: 413 });
  const data = Buffer.from(await file.arrayBuffer());
  const type = sniff(data);
  if (!type) return NextResponse.json({ error: "Use a PDF, Word (.docx), PNG, JPEG or WebP file" }, { status: 415 });

  const base = (file.name || "spo").replace(/\.[^.]+$/, "").slice(0, 80);
  const fields = {
    fileName: `${base}.${type.ext}`,
    mimeType: type.mime,
    size: data.length,
    data,
    uploadedById: g.user.id,
  };
  const doc = await db.bookingDocument.upsert({
    where: { bookingId_kind: { bookingId: g.booking.id, kind: "SPO" } },
    create: { bookingId: g.booking.id, kind: "SPO", ...fields },
    update: { ...fields, createdAt: new Date() },
    select: { id: true, fileName: true, size: true, mimeType: true },
  });
  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard((await params).id, "update");
  if ("error" in g) return g.error;
  await db.bookingDocument.deleteMany({ where: { bookingId: g.booking.id, kind: "SPO" } });
  return NextResponse.json({ ok: true });
}
