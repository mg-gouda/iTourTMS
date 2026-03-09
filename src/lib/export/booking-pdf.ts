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
  adults: number;
  children: number;
  infants: number;
  childAges?: number[];
  specialRequests: string | null;
  internalNotes: string | null;
  bookingNotes: string | null;
  source: string;
  createdAt?: string | Date | null;

  hotel: {
    name: string;
    code?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  market?: { name: string } | null;
  currency: { code: string; symbol: string };
  rooms: Array<{
    roomIndex: number;
    roomType: { name: string; code?: string };
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

  // Special offer
  spoCode?: string | null;

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

function fmtDate(d: string | Date): string {
  return format(typeof d === "string" ? new Date(d) : d, "dd/MMM/yy");
}

function sanitize(s: string): string {
  return s
    .replace(/\u2212/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"');
}

// ---------------------------------------------------------------------------
// PDF Generation — Booking Rooming List (portrait A4)
// ---------------------------------------------------------------------------

export function generateBookingPdf(data: BookingPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const pageH = doc.internal.pageSize.getHeight(); // 297
  const mL = 20; // left margin
  const mR = 20; // right margin
  const cW = pageW - mL - mR; // content width ~170
  let y = 20;

  const sym = data.currency.symbol;
  const black: [number, number, number] = [0, 0, 0];
  const gray: [number, number, number] = [100, 100, 100];

  // ── {CompanyLogo} — centered at top ──
  if (data.company?.name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...black);
    doc.text(data.company.name, pageW / 2, y, { align: "center" });
    y += 10;
  }

  // ── {BookingStatus} — centered below logo ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...black);
  doc.text(data.status, pageW / 2, y, { align: "center" });
  y += 12;

  // ── Hotel Code / Hotel Name row ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...black);

  const midX = pageW / 2;

  if (data.hotel.code) {
    doc.text("Hotel Code:", mL, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.hotel.code, mL + 28, y);
  }

  doc.setFont("helvetica", "bold");
  doc.text("Hotel Name:", midX, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.hotel.name, midX + 28, y);

  y += 10;

  // ── Flight Details Table (dynamic — only shown if flight data exists) ──
  const hasArrival = data.arrivalFlightNo;
  const hasDepart = data.departFlightNo;

  if (hasArrival || hasDepart) {
    const colW = cW / 6;
    const tableX = mL;
    const rowH = 7;

    // Header row with borders
    const headers = ["Arrival Date", "Arrival Flight", "Arrival Time", "Departure Date", "Departure Flight", "Departure Time"];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...black);

    for (let i = 0; i < 6; i++) {
      const cx = tableX + i * colW;
      doc.rect(cx, y, colW, rowH, "S");
      doc.text(headers[i], cx + 2, y + 5);
    }
    y += rowH;

    // Value row with borders
    const values = [
      hasArrival ? fmtDate(data.checkIn) : "",
      data.arrivalFlightNo ?? "",
      data.arrivalTime ?? "",
      hasDepart ? fmtDate(data.checkOut) : "",
      data.departFlightNo ?? "",
      data.departTime ?? "",
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (let i = 0; i < 6; i++) {
      const cx = tableX + i * colW;
      doc.rect(cx, y, colW, rowH, "S");
      doc.text(values[i], cx + 2, y + 5);
    }
    y += rowH + 6;
  }

  // ── Booking Reference / Duration / Adult / Children / Child Ages row ──
  {
    doc.setFontSize(9);
    const col1 = mL;
    const col2 = mL + 45;
    const col3 = mL + 85;
    const col4 = mL + 115;
    const col5 = mL + 145;
    const col6 = mL + 170; // only used if 2nd child age

    // Labels
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text("Booking Reference:", col1, y);
    doc.text("Duration:", col2, y);
    doc.text("Adult", col3, y);
    doc.text("Children:", col4, y);

    if (data.childAges && data.childAges.length >= 1) {
      doc.text("1st Child Age", col5, y);
    }
    // Use remaining space if needed
    if (data.childAges && data.childAges.length >= 2) {
      // Adjust — put 2nd child age label inline
    }

    y += 5;

    // Values
    doc.setFont("helvetica", "normal");
    doc.text(data.code, col1, y);
    doc.text(`${data.nights} Night${data.nights !== 1 ? "s" : ""}`, col2, y);
    doc.text(String(data.adults), col3, y);
    doc.text(String(data.children), col4, y);

    if (data.childAges && data.childAges.length >= 1) {
      doc.text(String(data.childAges[0]), col5, y);
    }

    y += 3;

    // If more than 1 child age, show as "2nd Child Age" on same line or next
    if (data.childAges && data.childAges.length >= 2) {
      // Go back up to label row level and add 2nd child age header
      const savedY = y;
      doc.setFont("helvetica", "bold");
      doc.text("2nd Child Age", col6, savedY - 8);
      doc.setFont("helvetica", "normal");
      doc.text(String(data.childAges[1]), col6, savedY - 3);
    }

    y += 7;
  }

  // ── Room Type / Booking Date / Meal Plan row ──
  {
    const leftCol = mL;
    const rightCol = midX;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...black);

    // Left side: Room Type
    doc.text("Room Type:", leftCol, y);

    // Right side: Booking Date + Meal Plan
    doc.text("Booking Date:", rightCol, y);
    doc.text("Meal Plan", rightCol + 55, y);

    y += 5;

    doc.setFont("helvetica", "normal");

    // Room type value — if multiple rooms, list them
    if (data.rooms.length === 1) {
      doc.text(data.rooms[0].roomType.name, leftCol, y);
    } else {
      const roomNames = data.rooms.map((r, i) => `${i + 1}. ${r.roomType.name}`).join(", ");
      const lines = doc.splitTextToSize(sanitize(roomNames), midX - leftCol - 5);
      doc.text(lines, leftCol, y);
    }

    // Booking date value
    if (data.createdAt) {
      doc.text(fmtDate(data.createdAt), rightCol, y);
    }

    // Meal plan value
    if (data.rooms.length === 1) {
      doc.text(`${data.rooms[0].mealBasis.name} (${data.rooms[0].mealBasis.mealCode})`, rightCol + 55, y);
    } else {
      const meals = Array.from(new Set(data.rooms.map(r => r.mealBasis.mealCode))).join(", ");
      doc.text(meals, rightCol + 55, y);
    }

    y += 12;
  }

  // ── Guest Names / SPO Code ──
  {
    const leftCol = mL + 10;
    const rightCol = midX;

    // Labels
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text("Guest Names:", leftCol, y);

    // SPO Code on the right (only if exists)
    if (data.spoCode) {
      doc.text("SPO Code:", rightCol, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text(data.spoCode, rightCol, y);
      y -= 5; // go back up for guest names
    }

    y += 6;

    // Guest name rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const rawGuests = (data.guestNames ?? []).filter(Boolean);
    const isStructured = rawGuests.length > 0 && typeof rawGuests[0] === "object" && rawGuests[0] !== null;

    if (isStructured) {
      const structured = rawGuests as Array<{ title?: string; name: string; type?: string }>;
      for (const g of structured) {
        if (y > pageH - 40) { doc.addPage(); y = 20; }
        const title = g.title ?? "";
        const name = sanitize(g.name);
        doc.text(title, leftCol, y);
        doc.text(name, leftCol + 18, y);
        y += 5;
      }
    } else if (rawGuests.length > 0) {
      for (const name of rawGuests as string[]) {
        if (y > pageH - 40) { doc.addPage(); y = 20; }
        doc.text(sanitize(String(name)), leftCol, y);
        y += 5;
      }
    } else if (data.leadGuestName) {
      doc.text(sanitize(data.leadGuestName), leftCol, y);
      y += 5;
    }

    y += 8;
  }

  // ── Remarks ──
  {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text("Remarks:", mL, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const remarks = [data.specialRequests, data.bookingNotes].filter(Boolean).join("\n");
    if (remarks) {
      const lines = doc.splitTextToSize(sanitize(remarks), cW);
      if (y + lines.length * 4 > pageH - 40) { doc.addPage(); y = 20; }
      doc.text(lines, mL, y);
      y += lines.length * 4 + 4;
    }

    y += 6;
  }

  // ── Hotel Cost (after remarks) ──
  {
    if (y > pageH - 50) { doc.addPage(); y = 20; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text("Hotel Cost:", mL, y);
    y += 6;

    doc.setFontSize(8);

    for (const room of data.rooms) {
      if (data.rooms.length > 1) {
        doc.setFont("helvetica", "bold");
        doc.text(`Room ${room.roomIndex}: ${room.roomType.name}`, mL, y);
        y += 5;
      }

      const bd = room.rateBreakdown;

      if (bd) {
        const valX = mL + 80;

        const addLine = (label: string, value: string, bold = false) => {
          if (y > pageH - 25) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", bold ? "bold" : "normal");
          doc.text(sanitize(label), mL + 4, y);
          doc.text(sanitize(value), valX, y);
          y += 4.5;
        };

        addLine(bd.baseRateLabel || "Base Rate", `${sym}${bd.baseRate.toFixed(2)}`);

        if (bd.roomTypeSupplement && bd.roomTypeSupplement.amount !== 0) {
          addLine(`+ ${bd.roomTypeSupplement.label}`, `${sym}${bd.roomTypeSupplement.amount.toFixed(2)}`);
        }
        if (bd.mealSupplement && bd.mealSupplement.amount !== 0) {
          addLine(`+ ${bd.mealSupplement.label}`, `${sym}${bd.mealSupplement.amount.toFixed(2)}`);
        }
        if (bd.occupancySupplement && bd.occupancySupplement.amount !== 0) {
          addLine(`+ ${bd.occupancySupplement.label}`, `${sym}${bd.occupancySupplement.amount.toFixed(2)}`);
        }
        if (bd.extraBedSupplement && bd.extraBedSupplement.amount !== 0) {
          addLine(`+ ${bd.extraBedSupplement.label}`, `${sym}${bd.extraBedSupplement.amount.toFixed(2)}`);
        }

        if (bd.childCharges?.length) {
          for (const ch of bd.childCharges) {
            addLine(`+ ${ch.label}`, ch.isFree ? "FREE" : `${sym}${ch.amount.toFixed(2)}`);
          }
        }

        if (bd.offerDiscounts?.length) {
          for (const od of bd.offerDiscounts) {
            addLine(`- ${od.offerName}`, `-${sym}${od.discount.toFixed(2)}`);
          }
        }

        // Divider line
        doc.setDrawColor(...black);
        doc.setLineWidth(0.3);
        doc.line(mL + 4, y - 1, valX + 30, y - 1);
        y += 2;

        addLine(`Total (${bd.nights} Night${bd.nights !== 1 ? "s" : ""})`, `${sym}${bd.totalStayAfterOffers.toFixed(2)}`, true);
        addLine("Rate Per Night", `${sym}${bd.totalPerNight.toFixed(2)}`);
      } else if (room.buyingRatePerNight != null) {
        doc.setFont("helvetica", "normal");
        doc.text(`Rate Per Night: ${sym}${Number(room.buyingRatePerNight).toFixed(2)}`, mL + 4, y);
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.text(`Total (${data.nights} Night${data.nights !== 1 ? "s" : ""}): ${sym}${Number(room.buyingTotal ?? 0).toFixed(2)}`, mL + 4, y);
        y += 5;
      }

      if (data.rooms.length > 1) y += 4;
    }
  }

  // ── Issue Date — bottom right ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(
      `Issue Date: ${format(new Date(), "dd/MMM/yy")}`,
      pageW - mR,
      pageH - 15,
      { align: "right" },
    );
  }

  return doc;
}
