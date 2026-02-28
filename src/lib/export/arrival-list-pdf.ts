import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = { r: 68, g: 36, b: 110 };
const WHITE = { r: 255, g: 255, b: 255 };
const ALT_ROW = { r: 248, g: 246, b: 252 };
const TEXT_DARK = { r: 30, g: 30, b: 30 };
const TEXT_MUTED = { r: 120, g: 120, b: 120 };

export interface ArrivalListRow {
  market: string;
  noOfRooms: number;
  hotelName: string;
  roomType: string;
  guestName: string;
  checkIn: string | Date;
  checkOut: string | Date;
  nights: number;
  mealBasis: string;
  adults: number;
  children: number;
  infants: number;
  child1Age: number | null;
  child2Age: number | null;
}

export interface ArrivalListSummary {
  totalRoomNights: number;
  totalRooms: number;
  totalAdults: number;
  totalChildren: number;
  totalInfants: number;
}

export interface ArrivalListPdfOptions {
  dateFrom: string;
  dateTo: string;
  rows: ArrivalListRow[];
  summary: ArrivalListSummary;
}

export function exportArrivalListPdf(options: ArrivalListPdfOptions): void {
  const { dateFrom, dateTo, rows, summary } = options;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = { top: 14, right: 14, bottom: 18, left: 14 };

  // ─── Title ───────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("HOTEL ARRIVAL LIST", pageW / 2, margin.top + 6, {
    align: "center",
  });

  // ─── Subtitle: date range ────────────────────────
  const fromLabel = format(new Date(dateFrom), "dd MMM yyyy");
  const toLabel = format(new Date(dateTo), "dd MMM yyyy");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
  doc.text(`${fromLabel}  —  ${toLabel}`, pageW / 2, margin.top + 12, {
    align: "center",
  });

  // ─── Summary stats (top-right) ───────────────────
  const statsX = pageW - margin.right;
  const statsY = margin.top + 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);

  const statLines = [
    `Total Room/Nights: ${summary.totalRoomNights}`,
    `TTL No Rooms: ${summary.totalRooms}`,
    `TTL Adult: ${summary.totalAdults}`,
    `TTL CHD: ${summary.totalChildren}`,
    `TTL INF: ${summary.totalInfants}`,
  ];
  statLines.forEach((line, i) => {
    doc.text(line, statsX, statsY + i * 3.5, { align: "right" });
  });

  const cursorY = margin.top + 20;

  // ─── Table ───────────────────────────────────────
  const headers = [
    "Market",
    "No RMS",
    "Hotel Name",
    "Room Type",
    "Guest Name",
    "Arr Date",
    "Dep Date",
    "NTS",
    "MB",
    "AD",
    "CH",
    "INF",
    "1st CHD\nAge",
    "2nd CHD\nAge",
  ];

  const body = rows.map((r) => [
    r.market,
    String(r.noOfRooms),
    r.hotelName,
    r.roomType,
    r.guestName,
    format(new Date(r.checkIn), "dd/MM/yyyy"),
    format(new Date(r.checkOut), "dd/MM/yyyy"),
    String(r.nights),
    r.mealBasis,
    String(r.adults),
    String(r.children),
    String(r.infants),
    r.child1Age != null ? String(r.child1Age) : "",
    r.child2Age != null ? String(r.child2Age) : "",
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [headers],
    body,
    margin: { left: margin.left, right: margin.right },
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: [WHITE.r, WHITE.g, WHITE.b],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { halign: "center", cellWidth: 14 },
      2: { cellWidth: 38 },
      3: { cellWidth: 28 },
      4: { cellWidth: 36 },
      5: { halign: "center", cellWidth: 22 },
      6: { halign: "center", cellWidth: 22 },
      7: { halign: "center", cellWidth: 10 },
      8: { halign: "center", cellWidth: 12 },
      9: { halign: "center", cellWidth: 10 },
      10: { halign: "center", cellWidth: 10 },
      11: { halign: "center", cellWidth: 10 },
      12: { halign: "center", cellWidth: 16 },
      13: { halign: "center", cellWidth: 16 },
    },
  });

  // ─── Footers ─────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const issuedOn = format(new Date(), "dd MMM yyyy 'at' HH:mm");

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.text(`Issued On: ${issuedOn}`, margin.left, pageH - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin.right, pageH - 8, {
      align: "right",
    });
  }

  // ─── Download ────────────────────────────────────
  const filename = `Hotel_Arrival_List_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(filename);
}
