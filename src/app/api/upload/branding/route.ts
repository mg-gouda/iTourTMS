import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "branding");

const VALID_FIELDS = ["logo", "favicon", "loginLogo", "sidebarLogo", "loginBg", "innerBg", "reportsLogo"] as const;
type BrandingField = (typeof VALID_FIELDS)[number];

const FIELD_TO_COLUMN: Record<BrandingField, string> = {
  logo: "logoUrl",
  favicon: "faviconUrl",
  loginLogo: "loginLogoUrl",
  sidebarLogo: "sidebarLogoUrl",
  loginBg: "loginBgUrl",
  innerBg: "innerBgUrl",
  reportsLogo: "reportsLogoUrl",
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const field = formData.get("field") as string | null;

    if (
      !file ||
      !field ||
      !VALID_FIELDS.includes(field as BrandingField)
    ) {
      return NextResponse.json(
        { error: "Missing file or invalid field" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: PNG, JPG, WEBP, GIF, SVG" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 5 MB" },
        { status: 400 },
      );
    }

    // Determine extension from original filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `${companyId}-${field}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Ensure directory exists, then write file
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Build public URL and persist to DB
    const publicUrl = `/uploads/branding/${filename}`;
    const column = FIELD_TO_COLUMN[field as BrandingField];

    await db.company.update({
      where: { id: companyId },
      data: { [column]: publicUrl },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[branding upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const field = searchParams.get("field");

    if (!field || !VALID_FIELDS.includes(field as BrandingField)) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    const companyId = session.user.companyId;
    const column = FIELD_TO_COLUMN[field as BrandingField];

    // Get current URL to find file on disk
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        logoUrl: true,
        faviconUrl: true,
        loginLogoUrl: true,
        sidebarLogoUrl: true,
        loginBgUrl: true,
        innerBgUrl: true,
        reportsLogoUrl: true,
      },
    });

    const currentUrl = company?.[column as keyof typeof company] as string | null;
    if (currentUrl) {
      const filePath = path.join(process.cwd(), "public", currentUrl);
      try {
        await unlink(filePath);
      } catch {
        // File may not exist on disk
      }
    }

    await db.company.update({
      where: { id: companyId },
      data: { [column]: null },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[branding delete]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    );
  }
}
