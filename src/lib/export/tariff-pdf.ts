import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { TariffExportData } from "./tariff-excel";

const BRAND = { r: 68, g: 36, b: 110 };
const WHITE = { r: 255, g: 255, b: 255 };
const ALT_ROW = { r: 248, g: 246, b: 252 };
const TEXT_DARK = { r: 30, g: 30, b: 30 };
const TEXT_MUTED = { r: 120, g: 120, b: 120 };

function fmtDecimal(v: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function exportTariffToPdf(data: TariffExportData, companyName: string): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = { top: 14, right: 14, bottom: 18, left: 14 };
  const contentW = pageW - margin.left - margin.right;

  let cursorY = margin.top;

  // ─── Header ────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(`Tariff — ${data.tariffName}`, pageW / 2, cursorY + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
  doc.text(
    `${data.contractName} (${data.contractCode}) | ${data.tourOperatorName} | ${data.currencyCode}`,
    pageW / 2,
    cursorY + 12,
    { align: "center" },
  );

  cursorY = cursorY + 20;

  // ─── Summary ──────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("Summary", margin.left, cursorY);
  cursorY += 1.5;
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.5);
  doc.line(margin.left, cursorY, margin.left + contentW, cursorY);
  cursorY += 4;

  const summaryRows = [
    ["Hotel", data.hotelName ?? "—"],
    ["Tour Operator", `${data.tourOperatorName} (${data.tourOperatorCode})`],
    ["Markup Rule", data.markupRuleName ?? "No markup (cost rates)"],
    ["Rate Basis", data.rateBasis === "PER_PERSON" ? "Per Person" : "Per Room"],
    ["Generated", format(new Date(data.generatedAt), "dd MMM yyyy HH:mm")],
  ];

  autoTable(doc, {
    startY: cursorY,
    body: summaryRows,
    margin: { left: margin.left, right: margin.right },
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 1.5,
      textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 6;

  // ─── Rates by Season ──────────────────────────────
  // Group rates by season
  const seasonGroups = new Map<string, typeof data.rates>();
  for (const rate of data.rates) {
    const key = rate.seasonLabel;
    if (!seasonGroups.has(key)) {
      seasonGroups.set(key, []);
    }
    seasonGroups.get(key)!.push(rate);
  }

  for (const [seasonLabel, seasonRates] of seasonGroups) {

    // Section title
    if (cursorY + 16 > pageH - margin.bottom) {
      doc.addPage();
      cursorY = margin.top;
    }
    cursorY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(seasonLabel, margin.left, cursorY);
    cursorY += 1.5;
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.3);
    doc.line(margin.left, cursorY, margin.left + contentW, cursorY);
    cursorY += 3;

    const head = ["Room Type", "Meal Plan", "Base Rate", "Markup", "Selling Rate"];
    const body = seasonRates.map((r) => [
      `${r.roomTypeName} (${r.roomTypeCode})`,
      `${r.mealBasisName} (${r.mealCode})`,
      fmtDecimal(r.baseRate),
      `+${fmtDecimal(r.markup)}`,
      fmtDecimal(r.sellingRate),
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [head],
      body,
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
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;
  }

  // ─── Footers ──────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  const generatedOn = format(new Date(), "dd MMM yyyy 'at' HH:mm");
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.text(
      `Generated on ${generatedOn} — ${companyName}`,
      margin.left,
      pageH - 8,
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageW - margin.right,
      pageH - 8,
      { align: "right" },
    );
  }

  // ─── Download ─────────────────────────────────────
  const filename = `Tariff_${data.contractCode}_${data.tourOperatorCode}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(filename);
}
