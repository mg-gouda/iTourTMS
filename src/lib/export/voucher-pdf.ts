import { format } from "date-fns";
import { jsPDF } from "jspdf";

// ---------------------------------------------------------------------------
// Types — mirrors the voucher.getById tRPC output
// ---------------------------------------------------------------------------

export interface VoucherPdfData {
  code: string;
  status: string;
  issuedAt: string | Date;
  booking: {
    code: string;
    checkIn: string | Date;
    checkOut: string | Date;
    nights: number;
    specialRequests: string | null;
    source: string;
    hotel: { name: string; address?: string | null; phone?: string | null; email?: string | null };
    tourOperator?: { name: string } | null;
    currency: { code: string; symbol: string };
    rooms: Array<{
      roomIndex: number;
      roomType: { name: string };
      mealBasis: { name: string; mealCode: string };
      adults: number;
      children: number;
      infants: number;
    }>;
    guests: Array<{
      isLeadGuest: boolean;
      guestType: string;
      guest: { firstName: string; lastName: string; email?: string | null; phone?: string | null };
    }>;
  };
  company?: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLORS = {
  primary: [25, 65, 120] as [number, number, number],
  headerBg: [240, 245, 250] as [number, number, number],
  lightGray: [248, 249, 250] as [number, number, number],
  border: [200, 210, 220] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  muted: [100, 110, 120] as [number, number, number],
};

function fmtDate(d: string | Date): string {
  return format(typeof d === "string" ? new Date(d) : d, "dd MMM yyyy");
}

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

export function generateVoucherPdf(data: VoucherPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 15;

  // ── Company Header ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(data.company?.name ?? "Accommodation Voucher", marginL, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const companyDetails: string[] = [];
  if (data.company?.address) companyDetails.push(data.company.address);
  if (data.company?.phone) companyDetails.push(`Tel: ${data.company.phone}`);
  if (data.company?.email) companyDetails.push(data.company.email);
  if (data.company?.website) companyDetails.push(data.company.website);
  if (companyDetails.length > 0) {
    doc.text(companyDetails.join("  |  "), marginL, 26);
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ACCOMMODATION VOUCHER", marginL, 36);

  y = 48;

  // ── Voucher & Booking Info ──
  doc.setTextColor(...COLORS.text);
  doc.setFillColor(...COLORS.headerBg);
  doc.roundedRect(marginL, y, contentW, 24, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Voucher: ${data.code}`, marginL + 4, y + 8);
  doc.text(`Booking: ${data.booking.code}`, marginL + 4, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text(`Issued: ${fmtDate(data.issuedAt)}`, marginL + contentW - 4, y + 8, { align: "right" });
  doc.text(`Status: ${data.status}`, marginL + contentW - 4, y + 16, { align: "right" });

  y += 32;

  // ── Hotel Details ──
  const hotel = data.booking.hotel;
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Hotel", marginL, y);
  y += 2;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, marginL + contentW, y);
  y += 6;

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(hotel.name, marginL + 4, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  if (hotel.address) { doc.text(hotel.address, marginL + 4, y); y += 5; }
  if (hotel.phone) { doc.text(`Tel: ${hotel.phone}`, marginL + 4, y); y += 5; }
  if (hotel.email) { doc.text(`Email: ${hotel.email}`, marginL + 4, y); y += 5; }

  y += 4;

  // ── Stay Details ──
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Stay Details", marginL, y);
  y += 2;
  doc.setDrawColor(...COLORS.primary);
  doc.line(marginL, y, marginL + contentW, y);
  y += 6;

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);

  const colW = contentW / 3;

  // Row: Check-in, Check-out, Nights
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Check-in", marginL + 4, y);
  doc.text("Check-out", marginL + colW + 4, y);
  doc.text("Nights", marginL + colW * 2 + 4, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(fmtDate(data.booking.checkIn), marginL + 4, y);
  doc.text(fmtDate(data.booking.checkOut), marginL + colW + 4, y);
  doc.text(String(data.booking.nights), marginL + colW * 2 + 4, y);
  y += 10;

  // ── Room Details ──
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Room Details", marginL, y);
  y += 2;
  doc.setDrawColor(...COLORS.primary);
  doc.line(marginL, y, marginL + contentW, y);
  y += 6;

  for (const room of data.booking.rooms) {
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(marginL, y - 3, contentW, 16, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text(`Room ${room.roomIndex}: ${room.roomType.name}`, marginL + 4, y + 2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(9);
    const occupancy = [
      `${room.adults} Adult${room.adults !== 1 ? "s" : ""}`,
      room.children > 0 ? `${room.children} Child${room.children !== 1 ? "ren" : ""}` : "",
      room.infants > 0 ? `${room.infants} Infant${room.infants !== 1 ? "s" : ""}` : "",
    ].filter(Boolean).join(", ");
    doc.text(`${room.mealBasis.name} (${room.mealBasis.mealCode})  •  ${occupancy}`, marginL + 4, y + 9);

    y += 20;
  }

  y += 2;

  // ── Guest Details ──
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Guests", marginL, y);
  y += 2;
  doc.setDrawColor(...COLORS.primary);
  doc.line(marginL, y, marginL + contentW, y);
  y += 6;

  const leadGuest = data.booking.guests.find((g) => g.isLeadGuest);
  if (leadGuest) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text(`Lead Guest: ${leadGuest.guest.firstName} ${leadGuest.guest.lastName}`, marginL + 4, y);
    y += 5;
    if (leadGuest.guest.email || leadGuest.guest.phone) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(9);
      const contact = [leadGuest.guest.email, leadGuest.guest.phone].filter(Boolean).join("  |  ");
      doc.text(contact, marginL + 4, y);
      y += 5;
    }
  }

  const additionalGuests = data.booking.guests.filter((g) => !g.isLeadGuest);
  if (additionalGuests.length > 0) {
    y += 2;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text("Additional Guests:", marginL + 4, y);
    y += 5;
    doc.setTextColor(...COLORS.text);
    for (const g of additionalGuests) {
      doc.text(`• ${g.guest.firstName} ${g.guest.lastName} (${g.guestType})`, marginL + 8, y);
      y += 5;
    }
  }

  y += 6;

  // ── Tour Operator ──
  if (data.booking.tourOperator) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Tour Operator", marginL, y);
    y += 2;
    doc.setDrawColor(...COLORS.primary);
    doc.line(marginL, y, marginL + contentW, y);
    y += 6;

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(data.booking.tourOperator.name, marginL + 4, y);
    y += 8;
  }

  // ── Special Requests ──
  if (data.booking.specialRequests) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Special Requests", marginL, y);
    y += 2;
    doc.setDrawColor(...COLORS.primary);
    doc.line(marginL, y, marginL + contentW, y);
    y += 6;

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.booking.specialRequests, contentW - 8);
    doc.text(lines, marginL + 4, y);
    y += lines.length * 4 + 4;
  }

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(marginL, footerY, marginL + contentW, footerY);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This voucher confirms accommodation as detailed above. Please present upon check-in.",
    marginL,
    footerY + 5,
  );
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}`,
    marginL + contentW,
    footerY + 5,
    { align: "right" },
  );

  return doc;
}
