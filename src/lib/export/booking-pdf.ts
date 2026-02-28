import { format } from "date-fns";
import { jsPDF } from "jspdf";

// ---------------------------------------------------------------------------
// Types — mirrors the booking.getById tRPC output
// ---------------------------------------------------------------------------

export interface BookingPdfData {
  code: string;
  status: string;
  checkIn: string | Date;
  checkOut: string | Date;
  nights: number;
  specialRequests: string | null;
  internalNotes: string | null;
  bookingNotes: string | null;
  source: string;

  hotel: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  market?: { name: string } | null;
  currency: { code: string; symbol: string };
  rooms: Array<{
    roomIndex: number;
    roomType: { name: string };
    mealBasis: { name: string; mealCode: string };
    adults: number;
    children: number;
    infants: number;
    buyingRatePerNight?: number | string | null;
    buyingTotal?: number | string | null;
    rateBreakdown?: {
      baseRate: number;
      baseRateLabel: string;
      roomTypeSupplement?: { label: string; amount: number } | null;
      mealSupplement?: { label: string; amount: number } | null;
      occupancySupplement?: { label: string; amount: number } | null;
      extraBedSupplement?: { label: string; amount: number } | null;
      childCharges?: Array<{ label: string; amount: number; isFree: boolean }>;
      adultTotalPerNight: number;
      childTotalPerNight: number;
      totalPerNight: number;
      totalStay: number;
      offerDiscounts?: Array<{ offerName: string; discount: number; description: string }>;
      totalStayBeforeOffers: number;
      totalStayAfterOffers: number;
      nights: number;
      rateBasis: string;
    } | null;
  }>;

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

export function generateBookingPdf(data: BookingPdfData): jsPDF {
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
  doc.text(data.company?.name ?? "Booking Confirmation", marginL, 18);

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
  doc.text("BOOKING CONFIRMATION", marginL, 36);

  y = 48;

  // ── Booking Info ──
  doc.setTextColor(...COLORS.text);
  doc.setFillColor(...COLORS.headerBg);
  doc.roundedRect(marginL, y, contentW, 24, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Booking: ${data.code}`, marginL + 4, y + 8);
  doc.text(`Status: ${data.status}`, marginL + 4, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text(`Source: ${data.source}`, marginL + contentW - 4, y + 8, { align: "right" });
  if (data.market) {
    doc.text(`Market: ${data.market.name}`, marginL + contentW - 4, y + 16, { align: "right" });
  }

  y += 32;

  // ── Hotel Details ──
  const hotel = data.hotel;
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

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Check-in", marginL + 4, y);
  doc.text("Check-out", marginL + colW + 4, y);
  doc.text("Nights", marginL + colW * 2 + 4, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(fmtDate(data.checkIn), marginL + 4, y);
  doc.text(fmtDate(data.checkOut), marginL + colW + 4, y);
  doc.text(String(data.nights), marginL + colW * 2 + 4, y);
  y += 10;

  // ── Flight Details ──
  const hasArrivalFlight = data.arrivalFlightNo;
  const hasDepartFlight = data.departFlightNo;

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
      const arrParts: string[] = [`Flight: ${data.arrivalFlightNo}`];
      if (data.arrivalTime) arrParts.push(`Time: ${data.arrivalTime}`);
      doc.text(arrParts.join("    "), marginL + 4, y);
      y += 5;

      const routeParts: string[] = [];
      if (data.arrivalOriginApt) routeParts.push(`From: ${data.arrivalOriginApt}`);
      if (data.arrivalDestApt) routeParts.push(`To: ${data.arrivalDestApt}`);
      if (data.arrivalTerminal) routeParts.push(`Terminal: ${data.arrivalTerminal}`);
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
      const depParts: string[] = [`Flight: ${data.departFlightNo}`];
      if (data.departTime) depParts.push(`Time: ${data.departTime}`);
      doc.text(depParts.join("    "), marginL + 4, y);
      y += 5;

      const routeParts: string[] = [];
      if (data.departOriginApt) routeParts.push(`From: ${data.departOriginApt}`);
      if (data.departDestApt) routeParts.push(`To: ${data.departDestApt}`);
      if (data.departTerminal) routeParts.push(`Terminal: ${data.departTerminal}`);
      if (routeParts.length > 0) {
        doc.text(routeParts.join("    "), marginL + 4, y);
        y += 5;
      }
      y += 2;
    }

    y += 2;
  }

  // ── Room Details (with full rate breakdown) ──
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Room Details", marginL, y);
  y += 2;
  doc.setDrawColor(...COLORS.primary);
  doc.line(marginL, y, marginL + contentW, y);
  y += 6;

  const sym = data.currency.symbol;

  for (const room of data.rooms) {
    // Check if we need a new page (estimate: header + breakdown could be ~80mm)
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = 15;
    }

    // Room header background
    doc.setFillColor(...COLORS.headerBg);
    doc.roundedRect(marginL, y - 3, contentW, 14, 1, 1, "F");

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
    y += 16;

    const bd = room.rateBreakdown;

    if (bd) {
      // Rate breakdown table
      const labelX = marginL + 8;
      const amountX = marginL + contentW - 8;

      const drawLine = (label: string, amount: string, bold = false) => {
        if (y > doc.internal.pageSize.getHeight() - 25) {
          doc.addPage();
          y = 15;
        }
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(9);
        doc.text(label, labelX, y);
        doc.text(amount, amountX, y, { align: "right" });
        y += 5;
      };

      // Base rate
      drawLine(bd.baseRateLabel || "Base Rate", `${sym}${bd.baseRate.toFixed(2)}`);

      // Supplements
      if (bd.roomTypeSupplement && bd.roomTypeSupplement.amount !== 0) {
        drawLine(`+ ${bd.roomTypeSupplement.label}`, `${sym}${bd.roomTypeSupplement.amount.toFixed(2)}`);
      }
      if (bd.mealSupplement && bd.mealSupplement.amount !== 0) {
        drawLine(`+ ${bd.mealSupplement.label}`, `${sym}${bd.mealSupplement.amount.toFixed(2)}`);
      }
      if (bd.occupancySupplement && bd.occupancySupplement.amount !== 0) {
        drawLine(`+ ${bd.occupancySupplement.label}`, `${sym}${bd.occupancySupplement.amount.toFixed(2)}`);
      }
      if (bd.extraBedSupplement && bd.extraBedSupplement.amount !== 0) {
        drawLine(`+ ${bd.extraBedSupplement.label}`, `${sym}${bd.extraBedSupplement.amount.toFixed(2)}`);
      }

      // Child charges
      if (bd.childCharges?.length) {
        for (const ch of bd.childCharges) {
          drawLine(
            `+ ${ch.label}`,
            ch.isFree ? "FREE" : `${sym}${ch.amount.toFixed(2)}`,
          );
        }
      }

      // Divider
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.line(labelX, y - 2, amountX, y - 2);

      // Per-night total
      drawLine(
        `Total / Night (${bd.rateBasis === "PER_PERSON" ? "per person" : "per room"})`,
        `${sym}${bd.totalPerNight.toFixed(2)}`,
        true,
      );

      // Stay total before offers
      drawLine(`${bd.nights} Night${bd.nights !== 1 ? "s" : ""} Total`, `${sym}${bd.totalStayBeforeOffers.toFixed(2)}`, true);

      // Offer discounts
      if (bd.offerDiscounts?.length) {
        for (const od of bd.offerDiscounts) {
          doc.setTextColor(34, 139, 34); // green
          drawLine(`− ${od.offerName}`, `−${sym}${od.discount.toFixed(2)}`);
          if (od.description) {
            doc.setFontSize(7);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(...COLORS.muted);
            const descLines = doc.splitTextToSize(od.description, contentW - 20);
            doc.text(descLines, labelX + 4, y);
            y += descLines.length * 3.5 + 1;
          }
        }
        doc.setTextColor(...COLORS.text);
      }

      // Final total after offers
      if (bd.totalStayAfterOffers !== bd.totalStayBeforeOffers) {
        doc.setDrawColor(...COLORS.border);
        doc.line(labelX, y - 2, amountX, y - 2);
        drawLine("Net Total (after offers)", `${sym}${bd.totalStayAfterOffers.toFixed(2)}`, true);
      }

      y += 4;
    } else if (room.buyingRatePerNight != null) {
      // Fallback: simple rate display when no breakdown available
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.text);
      doc.text(
        `Rate: ${sym}${Number(room.buyingRatePerNight).toFixed(2)}/night  •  Total: ${sym}${Number(room.buyingTotal ?? 0).toFixed(2)}`,
        marginL + 8,
        y,
      );
      y += 8;
    }

    y += 2;
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

  const rawGuestNames = (data.guestNames ?? []).filter(Boolean);
  const isStructuredGuests = rawGuestNames.length > 0 && typeof rawGuestNames[0] === "object" && rawGuestNames[0] !== null;

  if (isStructuredGuests) {
    const structured = rawGuestNames as Array<{ title?: string; name: string; dob?: string; roomIndex?: number; type?: string }>;

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
      for (let i = 1; i < guestNames.length; i++) {
        doc.text(`• ${guestNames[i]}`, marginL + 8, y);
        y += 5;
      }
    }
  } else if (data.leadGuestName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text(`Lead Guest: ${data.leadGuestName}`, marginL + 4, y);
    y += 5;
  }

  y += 6;

  // ── Special Requests ──
  if (data.specialRequests) {
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
    const lines = doc.splitTextToSize(data.specialRequests, contentW - 8);
    doc.text(lines, marginL + 4, y);
    y += lines.length * 4 + 4;
  }

  // ── Notes ──
  if (data.bookingNotes) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", marginL, y);
    y += 2;
    doc.setDrawColor(...COLORS.primary);
    doc.line(marginL, y, marginL + contentW, y);
    y += 6;

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.bookingNotes, contentW - 8);
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
    "This document confirms the booking details as listed above.",
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
