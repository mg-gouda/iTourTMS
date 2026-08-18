import { NextResponse, type NextRequest } from "next/server";

import { partnerAuth } from "@/lib/auth-partner";
import { auditPartner } from "@/lib/b2b/audit";
import { generateB2bManualPdf } from "@/lib/export/b2b-manual-pdf";
import { b2bManual } from "@/lib/help/b2b-manual";
import { db } from "@/server/db";

/** The whole partner guide as one file, for printing or passing to a new starter. */
export async function GET(req: NextRequest) {
  const session = await partnerAuth();
  const user = session?.user as
    | { id: string; realm?: string; companyId?: string | null; tourOperatorId?: string | null }
    | undefined;

  if (!user || user.realm !== "partner" || !user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await db.company.findUnique({
    where: { id: user.companyId },
    select: { name: true },
  });

  const pdf = generateB2bManualPdf(b2bManual, company?.name ?? "");

  await auditPartner("DOCUMENT_DOWNLOADED", {
    companyId: user.companyId,
    tourOperatorId: user.tourOperatorId,
    userId: user.id,
    entityType: "Manual",
    request: req,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="portal-guide.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
