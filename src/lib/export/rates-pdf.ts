import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { CHILD_AGE_CATEGORY_LABELS } from "@/lib/constants/contracting";
import type { FullRateGridData } from "@/server/services/contracting/rate-calculator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RatesPdfOptions {
  hotelName: string;
  contractCode: string;
  contractName: string;
  currency: string;
  rateBasis: string;
  companyName: string;
  logoBase64?: string | null;
  logoFormat?: string;
}

// ---------------------------------------------------------------------------
// Colours (same as contract-pdf.ts)
// ---------------------------------------------------------------------------

const BRAND = { r: 68, g: 36, b: 110 };
const BRAND_LIGHT = { r: 245, g: 241, b: 250 };
const ALT_ROW = { r: 248, g: 246, b: 252 };
const WHITE = { r: 255, g: 255, b: 255 };
const TEXT_DARK = { r: 30, g: 30, b: 30 };
const TEXT_MUTED = { r: 120, g: 120, b: 120 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtSeasonDates(dateFrom: string, dateTo: string): string {
  return `${format(new Date(dateFrom), "dd MMM")} — ${format(new Date(dateTo), "dd MMM yyyy")}`;
}

function fmtDecimal(v: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

// ---------------------------------------------------------------------------
// PDF Generator
// ---------------------------------------------------------------------------

export function generateRatesPdf(
  grid: FullRateGridData,
  options: RatesPdfOptions,
): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = { top: 14, right: 14, bottom: 18, left: 14 };
  const contentW = pageW - margin.left - margin.right;

  let cursorY = margin.top;

  // ─── Reusable: Section title ───────────────────────────
  function sectionTitle(title: string): void {
    if (cursorY + 16 > pageH - margin.bottom) {
      doc.addPage();
      cursorY = margin.top;
    }
    cursorY += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(title, margin.left, cursorY);
    cursorY += 1.5;
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.5);
    doc.line(margin.left, cursorY, margin.left + contentW, cursorY);
    cursorY += 4;
  }

  // ─── Reusable: autoTable wrapper ───────────────────────
  function addTable(
    head: string[],
    body: string[][],
    opts?: {
      columnStyles?: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }>;
    },
  ): void {
    if (body.length === 0) return;
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
      columnStyles: opts?.columnStyles ?? {},
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;
  }

  // ─── Footer on every page ─────────────────────────────
  function addFooters(): void {
    const totalPages = doc.getNumberOfPages();
    const generatedOn = format(new Date(), "dd MMM yyyy 'at' HH:mm");
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
      doc.text(
        `Generated on ${generatedOn} — ${options.companyName}`,
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
  }

  // =====================================================================
  // HEADER
  // =====================================================================

  if (options.logoBase64 && options.logoFormat) {
    try {
      doc.addImage(
        options.logoBase64,
        options.logoFormat.toUpperCase(),
        margin.left,
        margin.top,
        40,
        0,
      );
    } catch {
      // Skip logo if it fails to load
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(`Calculated Rates — ${options.hotelName}`, pageW / 2, margin.top + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
  doc.text(
    `${options.contractName} — ${options.contractCode} | ${options.currency}`,
    pageW / 2,
    margin.top + 12,
    { align: "center" },
  );

  cursorY = margin.top + 20;

  // =====================================================================
  // RATE GRID
  // =====================================================================

  sectionTitle("Rate Grid");

  const mealHeaders = grid.mealBases.map(
    (mb) => mb.suppLabel ? `${mb.name} ${mb.suppLabel}` : mb.name,
  );
  const rateHead = ["Room Type", "Occ", "Season", ...mealHeaders];

  const rateBody: string[][] = [];
  for (const rt of grid.roomTypes) {
    for (const variant of grid.occupancyVariants) {
      for (const season of grid.seasons) {
        const row: string[] = [
          rt.name + (rt.isBase ? " (base)" : rt.suppLabel ? ` ${rt.suppLabel}` : ""),
          variant.label,
          fmtSeasonDates(season.dateFrom, season.dateTo),
        ];
        for (const mb of grid.mealBases) {
          const cell = grid.cells.find(
            (c) =>
              c.roomTypeId === rt.id &&
              c.occupancyLabel === variant.label &&
              c.seasonId === season.id &&
              c.mealBasisId === mb.id,
          );
          row.push(cell ? fmtDecimal(cell.adultRate) : "—");
        }
        rateBody.push(row);
      }
    }
  }

  const mealColStyles: Record<number, { halign: "right" }> = {};
  for (let i = 0; i < grid.mealBases.length; i++) {
    mealColStyles[3 + i] = { halign: "right" };
  }

  addTable(rateHead, rateBody, { columnStyles: mealColStyles });

  // Rate note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
  doc.text(
    `All rates in ${options.currency}, ${options.rateBasis.toLowerCase().replace("_", " ")} per night.`,
    margin.left,
    cursorY,
  );
  cursorY += 4;

  // =====================================================================
  // CHILD RATES
  // =====================================================================

  if (grid.childRates.length > 0) {
    sectionTitle("Child Rates");

    const childHead = ["Category", "Age", "Bedding", "Season", ...grid.mealBases.map((mb) => mb.name)];

    // Build unique child row keys
    const seen = new Set<string>();
    const childKeys: { category: string; ageRange: string; bedding: string }[] = [];
    for (const cr of grid.childRates) {
      const key = `${cr.category}|${cr.bedding}`;
      if (!seen.has(key)) {
        seen.add(key);
        childKeys.push({ category: cr.category, ageRange: cr.ageRange, bedding: cr.bedding });
      }
    }

    const childBody: string[][] = [];
    for (const ck of childKeys) {
      for (const season of grid.seasons) {
        const row: string[] = [
          CHILD_AGE_CATEGORY_LABELS[ck.category] ?? ck.category,
          ck.ageRange,
          ck.bedding,
          fmtSeasonDates(season.dateFrom, season.dateTo),
        ];
        for (const mb of grid.mealBases) {
          const cr = grid.childRates.find(
            (c) =>
              c.category === ck.category &&
              c.bedding === ck.bedding &&
              c.seasonId === season.id &&
              c.mealBasisId === mb.id,
          );
          if (cr) {
            row.push(cr.isFree ? "FREE" : fmtDecimal(cr.rate));
          } else {
            row.push("—");
          }
        }
        childBody.push(row);
      }
    }

    const childMealStyles: Record<number, { halign: "right" }> = {};
    for (let i = 0; i < grid.mealBases.length; i++) {
      childMealStyles[4 + i] = { halign: "right" };
    }

    addTable(childHead, childBody, { columnStyles: childMealStyles });
  }

  // ─── Add footers ──────────────────────────────────────
  addFooters();

  // ─── Return buffer ─────────────────────────────────────
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
