import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  CANCELLATION_CHARGE_TYPE_LABELS,
  CHILD_AGE_CATEGORY_LABELS,
  CONTRACT_STATUS_LABELS,
  OFFER_TYPE_LABELS,
  RATE_BASIS_LABELS,
  SUPPLEMENT_TYPE_LABELS,
} from "@/lib/constants/contracting";

// ---------------------------------------------------------------------------
// Types — mirrors the getForExport tRPC output
// ---------------------------------------------------------------------------

export interface ContractPdfData {
  name: string;
  code: string;
  status: string;
  version: number;
  rateBasis: string;
  minimumStay: number;
  maximumStay: number | null;
  validFrom: string | Date;
  validTo: string | Date;
  travelFrom: string | Date | null;
  travelTo: string | Date | null;
  terms: string | null;
  internalNotes: string | null;
  hotelNotes: string | null;
  hotel: { name: string; code: string };
  baseCurrency: { code: string; name: string };
  baseRoomType: { name: string; code: string };
  baseMealBasis: { name: string; mealCode: string };
  seasons: Array<{
    code: string;
    name: string;
    dateFrom: string | Date;
    dateTo: string | Date;
    releaseDays: number;
    minimumStay: number | null;
  }>;
  roomTypes: Array<{
    isBase: boolean;
    roomType: { name: string; code: string };
  }>;
  mealBases: Array<{
    isBase: boolean;
    mealBasis: { name: string; mealCode: string };
  }>;
  baseRates: Array<{
    rate: unknown;
    singleRate: unknown;
    doubleRate: unknown;
    tripleRate: unknown;
    season: { code: string; name: string };
  }>;
  supplements: Array<{
    supplementType: string;
    valueType: string;
    value: unknown;
    isReduction: boolean;
    perPerson: boolean;
    perNight: boolean;
    label: string | null;
    roomType: { name: string } | null;
    mealBasis: { name: string } | null;
  }>;
  specialOffers: Array<{
    name: string;
    offerType: string;
    discountType: string;
    discountValue: unknown;
    validFrom: string | Date | null;
    validTo: string | Date | null;
    bookByDate: string | Date | null;
    minimumNights: number | null;
    active: boolean;
  }>;
  allotments: Array<{
    totalRooms: number;
    freeSale: boolean;
    season: { code: string; name: string };
    roomType: { name: string; code: string };
  }>;
  childPolicies: Array<{
    category: string;
    ageFrom: number;
    ageTo: number;
    label: string | null;
    freeInSharing: boolean;
    maxFreePerRoom: number;
    extraBedAllowed: boolean;
    mealsIncluded: boolean;
  }>;
  cancellationPolicies: Array<{
    daysBefore: number;
    chargeType: string;
    chargeValue: unknown;
    description: string | null;
  }>;
  markets: Array<{
    market: { name: string; code: string };
  }>;
}

export interface ContractPdfOptions {
  companyName: string;
  logoBase64?: string | null;
  logoFormat?: string;
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const BRAND = { r: 68, g: 36, b: 110 }; // dark purple
const BRAND_LIGHT = { r: 245, g: 241, b: 250 };
const ALT_ROW = { r: 248, g: 246, b: 252 };
const WHITE = { r: 255, g: 255, b: 255 };
const TEXT_DARK = { r: 30, g: 30, b: 30 };
const TEXT_MUTED = { r: 120, g: 120, b: 120 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy");
}

function fmtDecimal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v));
}

// ---------------------------------------------------------------------------
// PDF Generator
// ---------------------------------------------------------------------------

export function generateContractPdf(
  data: ContractPdfData,
  options: ContractPdfOptions,
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

  // Logo (top-left)
  if (options.logoBase64 && options.logoFormat) {
    try {
      doc.addImage(
        options.logoBase64,
        options.logoFormat.toUpperCase(),
        margin.left,
        margin.top,
        40,
        0, // auto height
      );
    } catch {
      // Skip logo if it fails to load
    }
  }

  // Title (centered)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(data.name, pageW / 2, margin.top + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
  doc.text(
    `${data.hotel.name} — ${data.code} (v${data.version})`,
    pageW / 2,
    margin.top + 12,
    { align: "center" },
  );

  cursorY = margin.top + 20;

  // =====================================================================
  // SECTION 1: Contract Summary
  // =====================================================================

  sectionTitle("Contract Summary");

  const summaryRows: string[][] = [
    ["Status", CONTRACT_STATUS_LABELS[data.status] ?? data.status, "Rate Basis", RATE_BASIS_LABELS[data.rateBasis] ?? data.rateBasis],
    ["Booking From", fmtDate(data.validFrom), "Booking To", fmtDate(data.validTo)],
    ["Travel From", fmtDate(data.travelFrom), "Travel To", fmtDate(data.travelTo)],
    ["Currency", `${data.baseCurrency.code} — ${data.baseCurrency.name}`, "Market Validity", data.markets.length > 0 ? data.markets.map((m) => m.market.name).join(", ") : "—"],
    ["Min Stay", `${data.minimumStay} night${data.minimumStay !== 1 ? "s" : ""}`, "Base Room Type", data.baseRoomType.name],
    ["Base Meal", data.baseMealBasis.name, "", ""],
  ];
  if (data.maximumStay) {
    summaryRows.push(["Max Stay", `${data.maximumStay} nights`, "", ""]);
  }

  autoTable(doc, {
    startY: cursorY,
    body: summaryRows,
    margin: { left: margin.left, right: margin.right },
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: contentW * 0.15, textColor: [BRAND.r, BRAND.g, BRAND.b] },
      1: { cellWidth: contentW * 0.35 },
      2: { fontStyle: "bold", cellWidth: contentW * 0.15, textColor: [BRAND.r, BRAND.g, BRAND.b] },
      3: { cellWidth: contentW * 0.35 },
    },
    alternateRowStyles: {
      fillColor: [BRAND_LIGHT.r, BRAND_LIGHT.g, BRAND_LIGHT.b],
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // =====================================================================
  // SECTION 2: Seasons
  // =====================================================================

  if (data.seasons.length > 0) {
    sectionTitle("Seasons");
    addTable(
      ["Code", "Name", "Date From", "Date To", "Release Days", "Min Stay"],
      data.seasons.map((s) => [
        s.code,
        s.name,
        fmtDate(s.dateFrom),
        fmtDate(s.dateTo),
        String(s.releaseDays),
        s.minimumStay != null ? String(s.minimumStay) : "—",
      ]),
    );
  }

  // =====================================================================
  // SECTION 3: Room Types & Meal Bases
  // =====================================================================

  sectionTitle("Room Types & Meal Bases");

  // Room Types table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.text("Room Types", margin.left, cursorY);
  cursorY += 3;

  addTable(
    ["Name", "Code", "Base"],
    data.roomTypes.map((rt) => [
      rt.roomType.name,
      rt.roomType.code,
      rt.isBase ? "Yes" : "",
    ]),
  );

  // Meal Bases table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.text("Meal Bases", margin.left, cursorY);
  cursorY += 3;

  addTable(
    ["Name", "Code", "Base"],
    data.mealBases.map((mb) => [
      mb.mealBasis.name,
      mb.mealBasis.mealCode,
      mb.isBase ? "Yes" : "",
    ]),
  );

  // =====================================================================
  // SECTION 4: Base Rate Sheet
  // =====================================================================

  if (data.baseRates.length > 0) {
    sectionTitle("Base Rate Sheet");

    const rateMap = new Map<string, (typeof data.baseRates)[number]>();
    for (const br of data.baseRates) {
      rateMap.set(br.season.code, br);
    }

    addTable(
      ["Season", "Rate", "Single", "Double", "Triple"],
      data.seasons.map((season) => {
        const rate = rateMap.get(season.code);
        return [
          `${season.code} (${season.name})`,
          rate ? fmtDecimal(rate.rate) : "—",
          rate ? fmtDecimal(rate.singleRate) : "—",
          rate ? fmtDecimal(rate.doubleRate) : "—",
          rate ? fmtDecimal(rate.tripleRate) : "—",
        ];
      }),
      {
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
      },
    );

    // Rate note
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.text(
      `All rates in ${data.baseCurrency.code}, ${(RATE_BASIS_LABELS[data.rateBasis] ?? data.rateBasis).toLowerCase()} per night.`,
      margin.left,
      cursorY,
    );
    cursorY += 4;
  }

  // =====================================================================
  // SECTION 5: Supplements
  // =====================================================================

  if (data.supplements.length > 0) {
    sectionTitle("Supplements");
    addTable(
      ["Type", "Room Type", "Meal Basis", "Label", "Value", "Per-P", "Per-N"],
      data.supplements.map((s) => {
        const prefix = s.isReduction ? "-" : "";
        const suffix = s.valueType === "PERCENTAGE" ? "%" : "";
        return [
          SUPPLEMENT_TYPE_LABELS[s.supplementType] ?? s.supplementType,
          s.roomType?.name ?? "—",
          s.mealBasis?.name ?? "—",
          s.label ?? "—",
          `${prefix}${fmtDecimal(s.value)}${suffix}`,
          s.perPerson ? "Yes" : "",
          s.perNight ? "Yes" : "",
        ];
      }),
      {
        columnStyles: {
          4: { halign: "right" },
        },
      },
    );
  }

  // =====================================================================
  // SECTION 6: Special Offers
  // =====================================================================

  if (data.specialOffers.length > 0) {
    sectionTitle("Special Offers");
    addTable(
      ["Name", "Type", "Discount", "Valid From", "Valid To", "Book By", "Min Nights", "Active"],
      data.specialOffers.map((so) => {
        const disc =
          so.discountType === "PERCENTAGE"
            ? `${Number(so.discountValue)}%`
            : fmtDecimal(so.discountValue);
        return [
          so.name,
          OFFER_TYPE_LABELS[so.offerType] ?? so.offerType,
          disc,
          fmtDate(so.validFrom),
          fmtDate(so.validTo),
          fmtDate(so.bookByDate),
          so.minimumNights != null ? String(so.minimumNights) : "—",
          so.active ? "Yes" : "No",
        ];
      }),
    );
  }

  // =====================================================================
  // SECTION 7: Allotments
  // =====================================================================

  if (data.allotments.length > 0) {
    sectionTitle("Allotments");
    addTable(
      ["Season", "Room Type", "Total Rooms", "Free Sale"],
      data.allotments.map((a) => [
        a.season.code,
        a.roomType.name,
        String(a.totalRooms),
        a.freeSale ? "Yes" : "No",
      ]),
    );
  }

  // =====================================================================
  // SECTION 8: Child Policies
  // =====================================================================

  if (data.childPolicies.length > 0) {
    sectionTitle("Child Policies");
    addTable(
      ["Category", "Age Range", "Label", "Free in Sharing", "Max Free/Room", "Extra Bed", "Meals Incl."],
      data.childPolicies.map((cp) => [
        CHILD_AGE_CATEGORY_LABELS[cp.category] ?? cp.category,
        `${cp.ageFrom}–${cp.ageTo} years`,
        cp.label ?? "—",
        cp.freeInSharing ? "Yes" : "No",
        String(cp.maxFreePerRoom),
        cp.extraBedAllowed ? "Yes" : "No",
        cp.mealsIncluded ? "Yes" : "No",
      ]),
    );
  }

  // =====================================================================
  // SECTION 9: Cancellation Policies
  // =====================================================================

  if (data.cancellationPolicies.length > 0) {
    sectionTitle("Cancellation Policy");

    function formatCharge(cp: ContractPdfData["cancellationPolicies"][number]): string {
      if (cp.chargeType === "FIRST_NIGHT") return "First Night Rate";
      if (cp.chargeType === "PERCENTAGE") return `${Number(cp.chargeValue)}%`;
      return fmtDecimal(cp.chargeValue);
    }

    addTable(
      ["Days Before Check-in", "Charge Type", "Charge", "Description"],
      data.cancellationPolicies.map((cp) => [
        `${cp.daysBefore}+ days`,
        CANCELLATION_CHARGE_TYPE_LABELS[cp.chargeType] ?? cp.chargeType,
        formatCharge(cp),
        cp.description ?? "—",
      ]),
    );
  }

  // =====================================================================
  // SECTION 10: Terms & Notes
  // =====================================================================

  if (data.terms || data.internalNotes || data.hotelNotes) {
    sectionTitle("Terms & Notes");

    const textBlocks: Array<{ label: string; text: string }> = [];
    if (data.terms) textBlocks.push({ label: "Contract Terms", text: data.terms });
    if (data.hotelNotes) textBlocks.push({ label: "Hotel Notes", text: data.hotelNotes });
    if (data.internalNotes) textBlocks.push({ label: "Internal Notes", text: data.internalNotes });

    for (const block of textBlocks) {
      if (cursorY + 14 > pageH - margin.bottom) {
        doc.addPage();
        cursorY = margin.top;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
      doc.text(block.label, margin.left, cursorY);
      cursorY += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);

      const lines = doc.splitTextToSize(block.text, contentW);
      for (const line of lines) {
        if (cursorY + 4 > pageH - margin.bottom) {
          doc.addPage();
          cursorY = margin.top;
        }
        doc.text(line, margin.left, cursorY);
        cursorY += 3.5;
      }
      cursorY += 4;
    }
  }

  // ─── Add footers to all pages ──────────────────────────
  addFooters();

  // ─── Return buffer ─────────────────────────────────────
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
