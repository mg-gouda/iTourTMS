import { NextResponse, type NextRequest } from "next/server";

import { partnerAuth } from "@/lib/auth-partner";
import { auditPartner } from "@/lib/b2b/audit";
import {
  generatePartnerBookingPdf,
  type PartnerDocumentKind,
} from "@/lib/export/partner-booking-pdf";
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

  const booking = await db.booking.findFirst({
    where: { id, companyId: user.companyId, tourOperatorId: user.tourOperatorId },
    select: {
      id: true,
      code: true,
      status: true,
      bookingDate: true,
      partnerReference: true,
      checkIn: true,
      checkOut: true,
      nights: true,
      buyingTotal: true,
      leadGuestFirstName: true,
      leadGuestLastName: true,
      guestNames: true,
      specialRequests: true,
      arrivalFlightNo: true,
      arrivalTime: true,
      arrivalOriginApt: true,
      arrivalDestApt: true,
      departFlightNo: true,
      departTime: true,
      departOriginApt: true,
      departDestApt: true,
      hotel: { select: { name: true, code: true, city: true, address: true, phone: true } },
      currency: { select: { code: true } },
      company: { select: { name: true } },
      tourOperator: { select: { name: true } },
      rooms: {
        orderBy: { roomIndex: "asc" },
        select: {
          roomIndex: true,
          adults: true,
          children: true,
          infants: true,
          buyingTotal: true,
          roomType: { select: { name: true } },
          mealBasis: { select: { name: true } },
        },
      },
      contract: {
        select: {
          cancellationPolicies: {
            orderBy: { daysBefore: "desc" },
            select: { daysBefore: true, chargeType: true, chargeValue: true },
          },
        },
      },
    },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A voucher is proof of a confirmed stay; issuing one for a booking the
  // hotel has not accepted would be handing over a promise we have not got.
  if (kind === "voucher" && booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "A voucher is available once the booking is confirmed." },
      { status: 409 },
    );
  }

  const guestNames = Array.isArray(booking.guestNames)
    ? (booking.guestNames as { firstName?: string; lastName?: string }[])
        .filter((g) => g?.firstName || g?.lastName)
        .map((g) => ({ firstName: g.firstName ?? "", lastName: g.lastName ?? "" }))
    : [];

  const cancellationNote = booking.contract?.cancellationPolicies.length
    ? booking.contract.cancellationPolicies
        .map((p) =>
          p.chargeType === "PERCENTAGE"
            ? `${p.daysBefore}+ days before arrival: ${Number(p.chargeValue)}% of the booking value`
            : p.chargeType === "FIRST_NIGHT"
              ? `${p.daysBefore}+ days before arrival: first night`
              : `${p.daysBefore}+ days before arrival: ${Number(p.chargeValue)} ${booking.currency?.code ?? ""}`,
        )
        .join(" · ")
    : null;

  const pdf = generatePartnerBookingPdf({
    kind,
    companyName: booking.company?.name ?? "",
    partnerName: booking.tourOperator?.name ?? "",
    code: booking.code,
    status: booking.status,
    bookingDate: booking.bookingDate,
    partnerReference: booking.partnerReference,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights: booking.nights ?? 0,
    hotel: {
      name: booking.hotel?.name ?? "",
      code: booking.hotel?.code,
      city: booking.hotel?.city,
      address: booking.hotel?.address,
      phone: booking.hotel?.phone,
    },
    leadGuest: `${booking.leadGuestFirstName ?? ""} ${booking.leadGuestLastName ?? ""}`.trim(),
    guestNames,
    rooms: booking.rooms.map((r) => ({
      roomIndex: r.roomIndex,
      roomType: r.roomType?.name ?? "",
      mealBasis: r.mealBasis?.name ?? "",
      adults: r.adults,
      children: r.children,
      infants: r.infants,
      net: Number(r.buyingTotal),
    })),
    currencyCode: booking.currency?.code ?? "",
    netTotal: Number(booking.buyingTotal),
    flights: {
      arrival: {
        flightNo: booking.arrivalFlightNo,
        time: booking.arrivalTime,
        from: booking.arrivalOriginApt,
        to: booking.arrivalDestApt,
      },
      departure: {
        flightNo: booking.departFlightNo,
        time: booking.departTime,
        from: booking.departOriginApt,
        to: booking.departDestApt,
      },
    },
    specialRequests: booking.specialRequests,
    cancellationNote,
  });

  await auditPartner("DOCUMENT_DOWNLOADED", {
    companyId: user.companyId,
    tourOperatorId: user.tourOperatorId,
    userId: user.id,
    entityType: "Booking",
    entityId: booking.id,
    request: req,
    metadata: { kind, code: booking.code },
  });

  return new NextResponse(Buffer.from(pdf.output("arraybuffer")), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${booking.code}-${kind}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
