import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "message/rfc822",
  "application/octet-stream", // .eml fallback
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "message/rfc822": "eml",
  "application/octet-stream": "eml",
};

const VALID_FOLDERS = ["b2c", "hotels", "blog", "general"] as const;

/**
 * Generic image upload endpoint.
 * POST /api/upload/image  (multipart form: file + folder)
 * Returns { url: "/uploads/{folder}/{filename}" }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!VALID_FOLDERS.includes(folder as (typeof VALID_FOLDERS)[number])) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: PNG, JPG, WEBP, GIF, SVG, PDF, DOCX, DOC, EML" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 10 MB" },
        { status: 400 },
      );
    }

    const ext = MIME_TO_EXT[file.type] || "png";
    const filename = `${session.user.companyId}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    const publicUrl = `/uploads/${folder}/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[image upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
