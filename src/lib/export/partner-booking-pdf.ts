import { format } from "date-fns";
import { jsPDF } from "jspdf";

/**
 * The two documents a partner can download for a booking.
 *
 * They are the same facts with a different audience, which is why one
 * generator serves both — and why the price only appears on one of them:
 *
 *  - **confirmation** goes to the partner, and states what they owe us;
 *  - **voucher** is handed to the traveller and shown at the hotel, so it
 *    carries no rates at all. A voucher that leaks the net rate hands the
 *    guest the partner's cost price.
 */
export type PartnerDocumentKind = "confirmation" | "voucher";

export interface PartnerBookingDocumentData {
  kind: PartnerDocumentKind;
  companyName: string;
  partnerName: string;
  code: string;
  status: string;
  bookingDate: Date | string | null;
  partnerReference: string | null;
  checkIn: Date | string;
  checkOut: Date | string;
  nights: number;
  hotel: { name: string; code?: string | null; city?: string | null; address?: string | null; phone?: string | null };
  leadGuest: string;
  guestNames: { firstName: string; lastName: string }[];
  rooms: {
    roomIndex: number;
    roomType: string;
    mealBasis: string;
    adults: number;
    children: number;
    infants: number;
    net: number;
  }[];
  currencyCode: string;
  netTotal: number;
  flights: {
    arrival?: { flightNo?: string | null; time?: string | null; from?: string | null; to?: string | null };
    departure?: { flightNo?: string | null; time?: string | null; from?: string | null; to?: string | null };
  };
  specialRequests: string | null;
  cancellationNote: string | null;
}

const d = (value: Date | string | null) => (value ? format(new Date(value), "dd MMM yyyy") : "—");

export function generatePartnerBookingPdf(data: PartnerBookingDocumentData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  const line = (label: string, value: string, x = margin, width = 60) => {
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(120);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
    doc.text(value || "—", x, y + 4.5, { maxWidth: width });
  };

  const rule = () => {
    doc.setDrawColor(220).setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // Header
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(20);
  doc.text(data.companyName, margin, y);
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(20);
  doc.text(data.kind === "voucher" ? "HOTEL VOUCHER" : "BOOKING CONFIRMATION", pageWidth - margin, y, {
    align: "right",
  });
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(120);
  doc.text(data.partnerName, margin, y);
  doc.text(`Reference ${data.code}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  rule();
  y += 8;

  // Stay
  line("Hotel", data.hotel.name, margin, 80);
  line("Check in", d(data.checkIn), margin + 90, 40);
  line("Check out", d(data.checkOut), margin + 135, 40);
  y += 12;

  line(
    "Location",
    [data.hotel.city, data.hotel.address].filter(Boolean).join(", ") || "—",
    margin,
    80,
  );
  line("Nights", String(data.nights), margin + 90, 40);
  line("Status", data.status.replace(/_/g, " "), margin + 135, 40);
  y += 12;

  line("Lead guest", data.leadGuest, margin, 80);
  line("Booked on", d(data.bookingDate), margin + 90, 40);
  line("Your reference", data.partnerReference ?? "—", margin + 135, 45);
  y += 14;

  rule();
  y += 7;

  // Rooms
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
  doc.text("Rooms", margin, y);
  y += 5;

  const showPrices = data.kind === "confirmation";
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(120);
  doc.text("#", margin, y);
  doc.text("ROOM TYPE", margin + 8, y);
  doc.text("BOARD", margin + 70, y);
  doc.text("OCCUPANCY", margin + 110, y);
  if (showPrices) doc.text("NET", pageWidth - margin, y, { align: "right" });
  y += 2;
  rule();
  y += 4.5;

  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40);
  for (const room of data.rooms) {
    doc.text(String(room.roomIndex), margin, y);
    doc.text(room.roomType, margin + 8, y, { maxWidth: 58 });
    doc.text(room.mealBasis, margin + 70, y, { maxWidth: 38 });
    doc.text(
      [
        `${room.adults} ad`,
        room.children ? `${room.children} ch` : null,
        room.infants ? `${room.infants} inf` : null,
      ]
        .filter(Boolean)
        .join(", "),
      margin + 110,
      y,
    );
    if (showPrices) {
      doc.text(room.net.toFixed(2), pageWidth - margin, y, { align: "right" });
    }
    y += 6;
  }

  y += 1;
  rule();
  y += 6;

  if (showPrices) {
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(20);
    doc.text("Total payable", margin, y);
    doc.text(`${data.currencyCode} ${data.netTotal.toFixed(2)}`, pageWidth - margin, y, {
      align: "right",
    });
    y += 9;
  } else {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
    doc.text("Accommodation and board as listed are prepaid.", margin, y);
    y += 8;
  }

  // Guests
  if (data.guestNames.length) {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
    doc.text("Guests", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40);
    for (const guest of data.guestNames) {
      doc.text(`${guest.firstName} ${guest.lastName}`.trim(), margin, y);
      y += 5;
    }
    y += 3;
  }

  // Flights
  const legs = [
    { label: "Arrival", leg: data.flights.arrival },
    { label: "Departure", leg: data.flights.departure },
  ].filter((l) => l.leg?.flightNo || l.leg?.time);

  if (legs.length) {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
    doc.text("Flights", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40);
    for (const { label, leg } of legs) {
      doc.text(
        `${label}: ${leg?.flightNo ?? "—"} ${leg?.time ?? ""} ${leg?.from ?? ""}${
          leg?.to ? ` → ${leg.to}` : ""
        }`.replace(/\s+/g, " "),
        margin,
        y,
      );
      y += 5;
    }
    y += 3;
  }

  if (data.specialRequests) {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
    doc.text("Special requests", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40);
    doc.text(data.specialRequests, margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 10;
  }

  if (data.cancellationNote && showPrices) {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30);
    doc.text("Cancellation", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40);
    doc.text(data.cancellationNote, margin, y, { maxWidth: pageWidth - margin * 2 });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150);
  doc.text(
    `Issued ${format(new Date(), "dd MMM yyyy HH:mm")} · ${data.companyName}`,
    margin,
    pageHeight - 10,
  );

  return doc;
}
