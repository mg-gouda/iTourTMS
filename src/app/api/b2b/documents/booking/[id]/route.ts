import { NextResponse, type NextRequest } from "next/server";

import { partnerAuth } from "@/lib/auth-partner";
import { auditPartner } from "@/lib/b2b/audit";
import type { PartnerDocumentKind } from "@/lib/export/partner-booking-pdf";
import { buildPartnerBookingPdf } from "@/server/services/b2b/partner-documents";
import { db } from "@/server/db";

/**
 * Booking documents for the partner portal.
 *
 * Served from the partner realm, not the staff one: a staff cookie carries no
 * weight here, and the booking is fetched with the partner's own id in the
 * WHERE clause so a guessed id returns nothing rather than someone else's
 * guests.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await partnerAuth();
  const user = session?.user as
    | { id: string; realm?: string; companyId?: string | null; tourOperatorId?: string | null }
    | undefined;

  if (!user || user.realm !== "partner" || !user.companyId || !user.tourOperatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const kind: PartnerDocumentKind =
    req.nextUrl.searchParams.get("kind") === "voucher" ? "voucher" : "confirmation";

  const scope = { companyId: user.companyId, tourOperatorId: user.tourOperatorId };
  const pdf = await buildPartnerBookingPdf(id, kind, scope);

  if (!pdf) {
    // Either it is not theirs, or a voucher was asked for before the hotel
    // confirmed. Both answer the same way: there is no document to give.
    const exists = await db.booking.findFirst({ where: { id, ...scope }, select: { status: true } });
    return exists
      ? NextResponse.json(
          { error: "A voucher is available once the booking is confirmed." },
          { status: 409 },
        )
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const booking = await db.booking.findFirstOrThrow({
    where: { id, ...scope },
    select: { code: true },
  });

  await auditPartner("DOCUMENT_DOWNLOADED", {
    companyId: user.companyId,
    tourOperatorId: user.tourOperatorId,
    userId: user.id,
    entityType: "Booking",
    entityId: id,
    request: req,
    metadata: { kind, code: booking.code },
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${booking.code}-${kind}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
