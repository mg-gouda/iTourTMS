import {
  generatePartnerBookingPdf,
  type PartnerDocumentKind,
} from "@/lib/export/partner-booking-pdf";
import { db } from "@/server/db";

/**
 * Assembling a partner booking document.
 *
 * Lives here rather than in the download route because the same PDF is also
 * attached to the confirmation email — two places building it from the same
 * booking is how the emailed voucher and the downloaded one drift apart.
 */
export async function buildPartnerBookingPdf(
  bookingId: string,
  kind: PartnerDocumentKind,
  scope?: { companyId: string; tourOperatorId: string },
): Promise<Buffer | null> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, ...(scope ?? {}) },
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

  if (!booking) return null;

  // A voucher is proof of a confirmed stay. Issuing one for a booking the
  // hotel has not accepted hands over a promise we have not got.
  if (kind === "voucher" && booking.status !== "CONFIRMED") return null;

  const guestNames = Array.isArray(booking.guestNames)
    ? (booking.guestNames as { firstName?: string; lastName?: string }[])
        .filter((g) => g?.firstName || g?.lastName)
        .map((g) => ({ firstName: g.firstName ?? "", lastName: g.lastName ?? "" }))
    : [];

  const currencyCode = booking.currency?.code ?? "";
  const cancellationNote = booking.contract?.cancellationPolicies.length
    ? booking.contract.cancellationPolicies
        .map((p) =>
          p.chargeType === "PERCENTAGE"
            ? `${p.daysBefore}+ days before arrival: ${Number(p.chargeValue)}% of the booking value`
            : p.chargeType === "FIRST_NIGHT"
              ? `${p.daysBefore}+ days before arrival: first night`
              : `${p.daysBefore}+ days before arrival: ${Number(p.chargeValue)} ${currencyCode}`,
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
    currencyCode,
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

  return Buffer.from(pdf.output("arraybuffer"));
}
