import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = { r: 68, g: 36, b: 110 };
const WHITE = { r: 255, g: 255, b: 255 };
const ALT_ROW = { r: 248, g: 246, b: 252 };
const TEXT_DARK = { r: 30, g: 30, b: 30 };
const TEXT_MUTED = { r: 120, g: 120, b: 120 };

export interface ReportPdfOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  orientation?: "portrait" | "landscape";
  columnStyles?: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }>;
}

export function exportReportToPdf(options: ReportPdfOptions): void {
  const doc = new jsPDF({
    orientation: options.orientation ?? "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = { top: 14, right: 14, bottom: 18, left: 14 };

  // ─── Header ────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(options.title, pageW / 2, margin.top + 6, { align: "center" });

  let cursorY = margin.top + 10;

  if (options.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.text(options.subtitle, pageW / 2, cursorY + 4, { align: "center" });
    cursorY += 8;
  }

  cursorY += 6;

  // ─── Table ─────────────────────────────────────────
  autoTable(doc, {
    startY: cursorY,
    head: [options.headers],
    body: options.rows,
    margin: { left: margin.left, right: margin.right },
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: [WHITE.r, WHITE.g, WHITE.b],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b],
    },
    columnStyles: options.columnStyles ?? {},
  });

  // ─── Footers ───────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  const generatedOn = format(new Date(), "dd MMM yyyy 'at' HH:mm");
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.text(`Generated on ${generatedOn}`, margin.left, pageH - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin.right, pageH - 8, {
      align: "right",
    });
  }

  // ─── Download ──────────────────────────────────────
  const filename = `${options.title.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(filename);
}
