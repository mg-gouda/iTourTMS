import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateApiDocs } from "@/lib/export/api-docs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const buffer = await generateApiDocs(baseUrl);

  return new Response(Uint8Array.from(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="iTourTMS-API-Documentation.docx"',
    },
  });
}
