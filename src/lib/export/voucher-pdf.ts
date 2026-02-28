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
    // Guest names — supports both old string[] and new structured format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guestNames?: any[] | null;
    leadGuestName?: string | null;
    // Flight details
    arrivalFlightNo?: string | null;
    arrivalTime?: string | null;
    arrivalOriginApt?: string | null;
    arrivalDestApt?: string | null;
    arrivalTerminal?: string | null;
    departFlightNo?: string | null;
    departTime?: string | null;
    departOriginApt?: string | null;
    departDestApt?: string | null;
    departTerminal?: string | null;
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

  // ── Flight Details ──
  const hasArrivalFlight = data.booking.arrivalFlightNo;
  const hasDepartFlight = data.booking.departFlightNo;

  if (hasArrivalFlight || hasDepartFlight) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Flight Details", marginL, y);
    y += 2;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, marginL + contentW, y);
    y += 6;

    if (hasArrivalFlight) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.text);
      doc.text("Arrival", marginL + 4, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      const arrParts: string[] = [`Flight: ${data.booking.arrivalFlightNo}`];
      if (data.booking.arrivalTime) arrParts.push(`Time: ${data.booking.arrivalTime}`);
      doc.text(arrParts.join("    "), marginL + 4, y);
      y += 5;

      const routeParts: string[] = [];
      if (data.booking.arrivalOriginApt) routeParts.push(`From: ${data.booking.arrivalOriginApt}`);
      if (data.booking.arrivalDestApt) routeParts.push(`To: ${data.booking.arrivalDestApt}`);
      if (data.booking.arrivalTerminal) routeParts.push(`Terminal: ${data.booking.arrivalTerminal}`);
      if (routeParts.length > 0) {
        doc.text(routeParts.join("    "), marginL + 4, y);
        y += 5;
      }
      y += 2;
    }

    if (hasDepartFlight) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.text);
      doc.text("Departure", marginL + 4, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      const depParts: string[] = [`Flight: ${data.booking.departFlightNo}`];
      if (data.booking.departTime) depParts.push(`Time: ${data.booking.departTime}`);
      doc.text(depParts.join("    "), marginL + 4, y);
      y += 5;

      const routeParts: string[] = [];
      if (data.booking.departOriginApt) routeParts.push(`From: ${data.booking.departOriginApt}`);
      if (data.booking.departDestApt) routeParts.push(`To: ${data.booking.departDestApt}`);
      if (data.booking.departTerminal) routeParts.push(`Terminal: ${data.booking.departTerminal}`);
      if (routeParts.length > 0) {
        doc.text(routeParts.join("    "), marginL + 4, y);
        y += 5;
      }
      y += 2;
    }

    y += 2;
  }

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

  const hasLinkedGuests = data.booking.guests.length > 0;
  const rawGuestNames = (data.booking.guestNames ?? []).filter(Boolean);
  const isStructuredGuests = rawGuestNames.length > 0 && typeof rawGuestNames[0] === "object" && rawGuestNames[0] !== null;

  if (hasLinkedGuests) {
    // Render from BookingGuest records (linked Guest model)
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
  } else if (isStructuredGuests) {
    // Structured format: [{ title, name, dob, roomIndex, type }]
    const structured = rawGuestNames as Array<{ title?: string; name: string; dob?: string; roomIndex?: number; type?: string }>;

    // Lead guest
    const leadGuest = structured[0];
    if (leadGuest) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.text);
      const leadName = leadGuest.title ? `${leadGuest.title} ${leadGuest.name}` : leadGuest.name;
      doc.text(`Lead Guest: ${leadName}`, marginL + 4, y);
      y += 7;
    }

    // Group by roomIndex
    const byRoom = new Map<number, typeof structured>();
    for (const g of structured) {
      const ri = g.roomIndex ?? 1;
      if (!byRoom.has(ri)) byRoom.set(ri, []);
      byRoom.get(ri)!.push(g);
    }

    for (const [roomIdx, guests] of byRoom) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.muted);
      doc.text(`Room ${roomIdx}:`, marginL + 4, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.text);
      for (const g of guests) {
        const name = g.title ? `${g.title} ${g.name}` : g.name;
        const suffix = g.type === "CHILD" && g.dob ? ` (DOB: ${fmtDate(g.dob)})` : "";
        doc.text(`• ${name}${suffix}`, marginL + 8, y);
        y += 5;
      }
      y += 2;
    }
  } else if (rawGuestNames.length > 0) {
    // Old format: string array
    const guestNames = rawGuestNames as string[];
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text(`Lead Guest: ${guestNames[0]}`, marginL + 4, y);
    y += 5;

    if (guestNames.length > 1) {
      y += 2;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      doc.text("Additional Guests:", marginL + 4, y);
      y += 5;
      doc.setTextColor(...COLORS.text);
      for (let i = 1; i < guestNames.length; i++) {
        doc.text(`• ${guestNames[i]}`, marginL + 8, y);
        y += 5;
      }
    }
  } else if (data.booking.leadGuestName) {
    // Last fallback: leadGuestName field
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text(`Lead Guest: ${data.booking.leadGuestName}`, marginL + 4, y);
    y += 5;
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
