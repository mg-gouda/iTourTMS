import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  CANCELLATION_CHARGE_TYPE_LABELS,
  CHILD_AGE_CATEGORY_LABELS,
  OFFER_TYPE_LABELS,
  RATE_BASIS_LABELS,
  SPECIAL_MEAL_OCCASION_LABELS,
  STAR_RATING_LABELS,
} from "@/lib/constants/contracting";
import { formatSeasonLabel } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TariffPdfOptions {
  companyName: string;
  logoBase64?: string | null;
  logoFormat?: string;
}

/** Selling rate entry stored in tariff JSON */
export interface TariffSellingRate {
  seasonLabel: string;
  roomTypeName: string;
  roomTypeCode: string;
  mealBasisName: string;
  mealCode: string;
  sellingRate: number;
}

/** Full contract data for the tariff PDF (same shape as ContractPdfData) */
export interface TariffPdfContractData {
  name: string;
  code: string;
  season: string | null;
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
  hotelNotes: string | null;
  hotel: {
    name: string;
    code: string;
    starRating?: string;
    city?: string;
    address?: string | null;
    phone?: string | null;
    fax?: string | null;
    email?: string | null;
    website?: string | null;
  };
  baseCurrency: { code: string; name: string };
  baseRoomType: { name: string; code: string };
  baseMealBasis: { name: string; mealCode: string };
  seasons: Array<{
    id: string;
    dateFrom: string | Date;
    dateTo: string | Date;
    releaseDays: number;
    minimumStay: number | null;
  }>;
  roomTypes: Array<{
    isBase: boolean;
    roomTypeId: string;
    roomType: {
      id?: string;
      name: string;
      code: string;
      minAdults?: number;
      standardAdults?: number;
      maxAdults?: number;
      maxChildren?: number;
      maxOccupancy?: number;
      extraBedAvailable?: boolean;
    };
  }>;
  mealBases: Array<{
    isBase: boolean;
    mealBasis: { name: string; mealCode: string };
  }>;
  supplements: Array<{
    supplementType: string;
    valueType: string;
    value: unknown;
    isReduction: boolean;
    perPerson: boolean;
    perNight: boolean;
    label: string | null;
    roomType: { name: string; id?: string } | null;
    roomTypeId: string | null;
    mealBasis: { name: string } | null;
    seasonId: string | null;
    forAdults: number | null;
    childPosition: number | null;
  }>;
  specialOffers: Array<{
    name: string;
    offerType: string;
    discountType: string;
    discountValue: unknown;
    validFrom: string | Date | null;
    validTo: string | Date | null;
    bookByDate: string | Date | null;
    bookFromDate: string | Date | null;
    minimumNights: number | null;
    stayNights: number | null;
    payNights: number | null;
    stayDateType: string | null;
    combinable: boolean;
    paymentPct: number | null;
    paymentDeadline: string | Date | null;
    roomingListBy: string | Date | null;
    active: boolean;
  }>;
  allotments: Array<{
    totalRooms: number;
    freeSale: boolean;
    basis: string;
    roomType: { name: string; code: string };
    season: { id: string; dateFrom: string | Date; dateTo: string | Date } | null;
  }>;
  stopSales: Array<{
    roomType: { name: string } | null;
    dateFrom: string | Date;
    dateTo: string | Date;
    reason: string | null;
  }>;
  marketingContributions: Array<{
    market: { name: string } | null;
    season: { dateFrom: string | Date; dateTo: string | Date } | null;
    valueType: string;
    value: unknown;
    notes: string | null;
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
  specialMeals?: Array<{
    occasion: string;
    customName: string | null;
    dateFrom: string | Date;
    dateTo: string | Date;
    mandatory: boolean;
    adultPrice: unknown;
    childPrice: unknown;
    teenPrice: unknown;
    infantPrice: unknown;
    excludedMealBases: string | null;
    notes: string | null;
  }>;
}

export interface TariffPdfInput {
  tariffName: string;
  tourOperatorName: string;
  tourOperatorCode: string;
  currencyCode: string;
  generatedAt: string;
  contract: TariffPdfContractData;
  sellingRates: TariffSellingRate[];
}

// ---------------------------------------------------------------------------
// Colours (identical to contract-pdf)
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
// PDF Generator — mirrors contract-pdf layout, uses selling rates
// ---------------------------------------------------------------------------

export function generateTariffPdf(
  input: TariffPdfInput,
  options: TariffPdfOptions,
): Buffer {
  const { contract: data, sellingRates } = input;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = { top: 10, right: 12, bottom: 16, left: 12 };
  const contentW = pageW - margin.left - margin.right;
  const HEADER_H = 44;
  const HEADER_BOTTOM = margin.top + HEADER_H;
  const CONTENT_BOTTOM = pageH - margin.bottom;
  let cursorY = HEADER_BOTTOM;

  // Build selling rate lookup: key = "seasonLabel|roomTypeCode" → sellingRate
  // Use the base meal basis rate
  const baseMealCode = data.baseMealBasis.mealCode;
  const sellingRateMap = new Map<string, number>();
  for (const r of sellingRates) {
    if (r.mealCode === baseMealCode) {
      sellingRateMap.set(`${r.seasonLabel}|${r.roomTypeCode}`, r.sellingRate);
    }
  }

  // ─── Reusable: Section title ───────────────────────────
  function sectionTitle(title: string): void {
    if (cursorY + 14 > CONTENT_BOTTOM) {
      doc.addPage();
      cursorY = HEADER_BOTTOM;
    }
    cursorY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(title, margin.left, cursorY);
    cursorY += 1.5;
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.5);
    doc.line(margin.left, cursorY, margin.left + contentW, cursorY);
    cursorY += 3;
  }


  // ─── Draw page header on a specific page ───────────────
  function drawPageHeader(pageIndex: number): void {
    doc.setPage(pageIndex);
    const y0 = margin.top;

    // Row 1: Logo (left) | Hotel name (right)
    if (options.logoBase64 && options.logoFormat) {
      try {
        doc.addImage(
          options.logoBase64,
          options.logoFormat.toUpperCase(),
          margin.left,
          y0,
          28,
          0,
        );
      } catch {
        // skip logo
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
    doc.text(data.hotel.name, pageW - margin.right, y0 + 5, {
      align: "right",
    });

    // Row 2: Star rating
    const y1 = y0 + 10;
    if (data.hotel.starRating) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
      doc.text(
        STAR_RATING_LABELS[data.hotel.starRating] ?? "",
        margin.left,
        y1,
      );
    }

    // Row 3: Info table
    const marketsText =
      data.markets.length > 0
        ? data.markets.map((m) => m.market.name).join(", ")
        : "All Markets";
    const seasonOrStay = data.season
      ? data.season
      : `${data.minimumStay} night${data.minimumStay !== 1 ? "s" : ""}`;

    const infoBody = [
      [
        "Location",
        data.hotel.address ?? data.hotel.city ?? "—",
        "Tariff",
        input.tariffName,
      ],
      [
        "Tour Operator",
        `${input.tourOperatorName} (${input.tourOperatorCode})`,
        "Reference",
        `${data.code} (v${data.version})`,
      ],
      [
        "Currency",
        `${data.baseCurrency.code} — ${data.baseCurrency.name}`,
        "Rate Basis",
        RATE_BASIS_LABELS[data.rateBasis] ?? data.rateBasis,
      ],
      [
        "Booking Dates",
        `${fmtDate(data.validFrom)} TO ${fmtDate(data.validTo)}`,
        "Stay Dates",
        (() => {
          if (data.travelFrom && data.travelTo) {
            return `${fmtDate(data.travelFrom)} TO ${fmtDate(data.travelTo)}`;
          }
          // Derive from seasons if travel dates are not set
          if (data.seasons.length > 0) {
            const sorted = [...data.seasons].sort(
              (a, b) => new Date(a.dateFrom).getTime() - new Date(b.dateFrom).getTime(),
            );
            return `${fmtDate(sorted[0].dateFrom)} TO ${fmtDate(sorted[sorted.length - 1].dateTo)}`;
          }
          return "—";
        })(),
      ],
      [
        "Markets",
        marketsText,
        data.season ? "Season" : "Min Stay",
        seasonOrStay,
      ],
    ];

    const infoY = y1 + 2;
    autoTable(doc, {
      startY: infoY,
      body: infoBody,
      margin: { left: margin.left, right: margin.right },
      tableWidth: contentW,
      theme: "grid",
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
        textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
        lineColor: [200, 200, 200],
        lineWidth: 0.15,
      },
      columnStyles: {
        0: {
          fontStyle: "bold",
          cellWidth: contentW * 0.12,
          textColor: [BRAND.r, BRAND.g, BRAND.b],
        },
        1: { cellWidth: contentW * 0.38 },
        2: {
          fontStyle: "bold",
          cellWidth: contentW * 0.12,
          textColor: [BRAND.r, BRAND.g, BRAND.b],
        },
        3: { cellWidth: contentW * 0.38 },
      },
      alternateRowStyles: {
        fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b],
      },
    });
  }

  function newSectionPage(): void {
    doc.addPage();
    cursorY = HEADER_BOTTOM;
  }

  function addHeadersAndFooters(): void {
    const totalPages = doc.getNumberOfPages();
    const generatedOn = format(new Date(), "dd MMM yyyy 'at' HH:mm");
    for (let i = 1; i <= totalPages; i++) {
      drawPageHeader(i);
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
      doc.text(
        `Generated on ${generatedOn} — ${options.companyName}`,
        margin.left,
        pageH - 6,
      );
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin.right, pageH - 6, {
        align: "right",
      });
    }
  }

  // =====================================================================
  // PAGE 1: Room Types & Selling Rates
  // =====================================================================

  // ── Room Types ──
  sectionTitle("Room Types");
  {
    const rtHead = [
      "Room Type", "Code", "Meal Basis", "Base",
      "Min Ad.", "Std Ad.", "Max Ad.", "Max Ch.", "Max Occ.", "Extra Bed",
    ];
    const rtBody = data.roomTypes.map((rt) => [
      rt.roomType.name,
      rt.roomType.code,
      rt.isBase
        ? data.baseMealBasis.name
        : data.mealBases.find((mb) => mb.isBase)?.mealBasis.name ?? "—",
      rt.isBase ? "Yes" : "",
      String(rt.roomType.minAdults ?? 1),
      String(rt.roomType.standardAdults ?? 2),
      String(rt.roomType.maxAdults ?? "—"),
      String(rt.roomType.maxChildren ?? "—"),
      String(rt.roomType.maxOccupancy ?? "—"),
      rt.roomType.extraBedAvailable ? "Yes" : "No",
    ]);
    if (rtBody.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [rtHead],
        body: rtBody,
        margin: { left: margin.left, right: margin.right, top: HEADER_BOTTOM },
        theme: "grid",
        styles: {
          fontSize: 6.5, cellPadding: 1.2,
          textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
          lineColor: [200, 200, 200], lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [BRAND.r, BRAND.g, BRAND.b],
          textColor: [WHITE.r, WHITE.g, WHITE.b],
          fontStyle: "bold", fontSize: 6.5,
        },
        alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 16, halign: "center" },
          2: { cellWidth: 22 },
          3: { cellWidth: 11, halign: "center" },
          4: { cellWidth: 13, halign: "center" },
          5: { cellWidth: 13, halign: "center" },
          6: { cellWidth: 13, halign: "center" },
          7: { cellWidth: 13, halign: "center" },
          8: { cellWidth: 15, halign: "center" },
          9: { cellWidth: 15, halign: "center" },
        },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 3;
    }
  }

  // ── Selling Rates Matrix ──
  if (sellingRates.length > 0 && data.roomTypes.length > 0) {
    sectionTitle("Selling Rates");

    // Helper: find a supplement value
    function findSupp(
      suppType: string,
      roomTypeId: string | null,
      seasonId: string | null,
      criteria: { forAdults?: number; childPosition?: number },
    ): { value: number; valueType: string; isReduction: boolean } | null {
      const matches = data.supplements.filter((s) => {
        if (s.supplementType !== suppType) return false;
        if (criteria.forAdults != null && s.forAdults !== criteria.forAdults) return false;
        if (criteria.childPosition != null && s.childPosition !== criteria.childPosition) return false;
        return true;
      });

      const rank = (s: (typeof matches)[number]) => {
        let r = 0;
        if (s.seasonId === seasonId) r += 2;
        else if (s.seasonId != null) return -1;
        if (s.roomTypeId === roomTypeId) r += 1;
        else if (s.roomTypeId != null) return -1;
        return r;
      };

      let best: (typeof matches)[number] | null = null;
      let bestRank = -1;
      for (const m of matches) {
        const r = rank(m);
        if (r > bestRank) { bestRank = r; best = m; }
      }
      if (!best) return null;
      return { value: Number(best.value), valueType: best.valueType, isReduction: best.isReduction };
    }

    // Get selling rate for a room type in a season
    function getSellingPP(rt: (typeof data.roomTypes)[number], season: (typeof data.seasons)[number]): number {
      const seasonLabel = formatSeasonLabel(season.dateFrom, season.dateTo);
      const key = `${seasonLabel}|${rt.roomType.code}`;
      return sellingRateMap.get(key) ?? 0;
    }

    const subCols = ["Rate PP", "SGL Sup\n%", "03rd AD\nRate Red", "01st Chd\n%", "02nd Chd\n%"];
    const RT_PER_TABLE = 4;

    const rtChunks: (typeof data.roomTypes)[] = [];
    for (let i = 0; i < data.roomTypes.length; i += RT_PER_TABLE) {
      rtChunks.push(data.roomTypes.slice(i, i + RT_PER_TABLE));
    }

    for (let chunkIdx = 0; chunkIdx < rtChunks.length; chunkIdx++) {
      const chunk = rtChunks[chunkIdx];
      const chunkLen = chunk.length;

      // Header row 1: "Date" spanning 2 cols + room type names
      const headRow1: any[] = [
        { content: "Date", colSpan: 2, styles: { halign: "center" } },
      ];
      for (const rt of chunk) {
        headRow1.push({
          content: rt.roomType.name,
          colSpan: subCols.length,
          styles: { halign: "center" },
        });
      }

      // Header row 2: From, To + sub-column labels
      const headRow2: any[] = [
        { content: "From", styles: { halign: "center" } },
        { content: "To", styles: { halign: "center" } },
      ];
      for (let i = 0; i < chunkLen; i++) {
        for (const sc of subCols) {
          headRow2.push({ content: sc, styles: { halign: "center" } });
        }
      }

      // Body rows (one per season)
      const ratesBody: string[][] = [];
      for (const season of data.seasons) {
        const row: string[] = [fmtDate(season.dateFrom), fmtDate(season.dateTo)];

        for (const rt of chunk) {
          const rtId = rt.roomTypeId;

          // Selling Rate PP (instead of Base PP)
          row.push(fmtDecimal(getSellingPP(rt, season)));

          // SGL Sup
          const sglSupp = findSupp("OCCUPANCY", rtId, season.id, { forAdults: 1 });
          row.push(sglSupp ? fmtDecimal(sglSupp.value) : "—");

          // 3rd AD
          const thirdAd = findSupp("OCCUPANCY", rtId, season.id, { forAdults: 3 });
          row.push(thirdAd ? fmtDecimal(thirdAd.value) : "—");

          // 1st Child
          const child1 = findSupp("CHILD", rtId, season.id, { childPosition: 1 });
          row.push(child1 ? fmtDecimal(child1.value) : "—");

          // 2nd Child
          const child2 = findSupp("CHILD", rtId, season.id, { childPosition: 2 });
          row.push(child2 ? fmtDecimal(child2.value) : "—");
        }

        ratesBody.push(row);
      }

      // Column styles
      const totalCols = 2 + chunkLen * subCols.length;
      const rateColStyles: Record<number, { halign: "center" | "right"; cellWidth?: number }> = {};
      rateColStyles[0] = { halign: "center", cellWidth: 22 };
      rateColStyles[1] = { halign: "center", cellWidth: 22 };
      for (let c = 2; c < totalCols; c++) {
        rateColStyles[c] = { halign: "right" };
      }

      if (chunkIdx === 1) {
        doc.addPage();
        cursorY = HEADER_BOTTOM;
      } else if (cursorY + 20 > CONTENT_BOTTOM) {
        doc.addPage();
        cursorY = HEADER_BOTTOM;
      }

      autoTable(doc, {
        startY: cursorY,
        head: [headRow1, headRow2],
        body: ratesBody,
        margin: { left: margin.left, right: margin.right, top: HEADER_BOTTOM },
        theme: "grid",
        styles: {
          fontSize: 6.5, cellPadding: 1.2,
          textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
          lineColor: [200, 200, 200], lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [BRAND_LIGHT.r, BRAND_LIGHT.g, BRAND_LIGHT.b],
          textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
          fontStyle: "normal", fontSize: 5.5, halign: "center",
        },
        alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
        columnStyles: rateColStyles,
      });
      cursorY = (doc as any).lastAutoTable.finalY + 4;
    }

    // Rate legend
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.5);
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.text(
      `Rate PP — Selling Rate Per Person Per Night, SGL Sup % — Single Supplement, 03rd AD Rate Red — Third Adult Rate Reduction, 01st/02nd Chd % — Child Percentage. All rates in ${data.baseCurrency.code}.`,
      margin.left,
      cursorY,
    );
    cursorY += 3;
  }

  // =====================================================================
  // CARD GRID: Compact info sections (identical to contract-pdf)
  // =====================================================================

  function drawCard(
    title: string, head: string[], body: string[][],
    cardX: number, cardY: number, cardW: number,
    opts?: { columnStyles?: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }> },
  ): number {
    if (body.length === 0) return cardY;
    autoTable(doc, {
      startY: cardY,
      head: [[{ content: title, colSpan: head.length, styles: { halign: "left" } }], head],
      body,
      margin: { left: cardX, right: pageW - cardX - cardW, top: HEADER_BOTTOM },
      tableWidth: cardW,
      theme: "grid",
      styles: {
        fontSize: 6, cellPadding: 1,
        textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
        lineColor: [200, 200, 200], lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [BRAND_LIGHT.r, BRAND_LIGHT.g, BRAND_LIGHT.b],
        textColor: [BRAND.r, BRAND.g, BRAND.b],
        fontStyle: "bold", fontSize: 6,
      },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
      columnStyles: opts?.columnStyles ?? {},
    });
    return (doc as any).lastAutoTable.finalY;
  }

  function drawKvCard(
    title: string, rows: string[][], cardX: number, cardY: number, cardW: number,
  ): number {
    if (rows.length === 0) return cardY;
    autoTable(doc, {
      startY: cardY,
      head: [[title, ""]],
      body: rows,
      margin: { left: cardX, right: pageW - cardX - cardW, top: HEADER_BOTTOM },
      tableWidth: cardW,
      theme: "grid",
      styles: {
        fontSize: 6, cellPadding: 1,
        textColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
        lineColor: [200, 200, 200], lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [BRAND_LIGHT.r, BRAND_LIGHT.g, BRAND_LIGHT.b],
        textColor: [BRAND.r, BRAND.g, BRAND.b],
        fontStyle: "bold", fontSize: 6,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: cardW * 0.4 },
        1: { cellWidth: cardW * 0.6 },
      },
    });
    return (doc as any).lastAutoTable.finalY;
  }

  interface CardDef {
    type: "table" | "kv";
    title: string;
    head?: string[];
    body: string[][];
    columnStyles?: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }>;
    estimatedRows: number;
  }

  const cards: CardDef[] = [];

  // 1. Seasons & Release Periods
  if (data.seasons.length > 0) {
    cards.push({
      type: "table",
      title: "Seasons & Release Periods",
      head: ["From", "To", "Release", "Min Stay"],
      body: data.seasons.map((s) => [
        fmtDate(s.dateFrom), fmtDate(s.dateTo),
        String(s.releaseDays),
        s.minimumStay != null ? String(s.minimumStay) : "—",
      ]),
      columnStyles: { 2: { halign: "center" }, 3: { halign: "center" } },
      estimatedRows: data.seasons.length,
    });
  }

  // 2. Child Policies
  if (data.childPolicies.length > 0) {
    cards.push({
      type: "table",
      title: "Child Policies",
      head: ["Category", "Age", "Free", "Max Free", "Extra Bed", "Meals"],
      body: data.childPolicies.map((cp) => [
        CHILD_AGE_CATEGORY_LABELS[cp.category] ?? cp.category,
        `${cp.ageFrom}–${cp.ageTo}`,
        cp.freeInSharing ? "Yes" : "No",
        String(cp.maxFreePerRoom),
        cp.extraBedAllowed ? "Yes" : "No",
        cp.mealsIncluded ? "Yes" : "No",
      ]),
      columnStyles: { 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
      estimatedRows: data.childPolicies.length,
    });
  }

  // 3. Rate / Room Calculation
  {
    const calcRows: string[][] = [];
    const baseRt = data.roomTypes.find((rt) => rt.isBase);
    if (baseRt) {
      calcRows.push([`${baseRt.roomType.name} (${baseRt.roomType.code})`, "Base Room"]);
    }
    for (const rt of data.roomTypes) {
      if (rt.isBase) continue;
      const supp = data.supplements.find(
        (s) => s.supplementType === "ROOM_TYPE" && s.roomType?.name === rt.roomType.name,
      );
      if (supp) {
        const prefix = supp.isReduction ? "-" : "+";
        const suffix = supp.valueType === "PERCENTAGE" ? "%" : ` ${data.baseCurrency.code}`;
        calcRows.push([
          `${rt.roomType.name} (${rt.roomType.code})`,
          `${prefix}${fmtDecimal(supp.value)}${suffix}`,
        ]);
      } else {
        calcRows.push([`${rt.roomType.name} (${rt.roomType.code})`, "Same as base"]);
      }
    }
    if (calcRows.length > 0) {
      cards.push({ type: "kv", title: "Rate / Room Calculation", body: calcRows, estimatedRows: calcRows.length });
    }
  }

  // 4. Cancellation Policy
  if (data.cancellationPolicies.length > 0) {
    function formatCharge(cp: TariffPdfContractData["cancellationPolicies"][number]): string {
      if (cp.chargeType === "FIRST_NIGHT") return "First Night";
      if (cp.chargeType === "PERCENTAGE") return `${Number(cp.chargeValue)}%`;
      return fmtDecimal(cp.chargeValue);
    }
    cards.push({
      type: "table",
      title: "Cancellation Policy",
      head: ["Days Before", "Type", "Charge"],
      body: data.cancellationPolicies.map((cp) => [
        `${cp.daysBefore}+`,
        CANCELLATION_CHARGE_TYPE_LABELS[cp.chargeType] ?? cp.chargeType,
        formatCharge(cp),
      ]),
      columnStyles: { 0: { halign: "center" }, 2: { halign: "right" } },
      estimatedRows: data.cancellationPolicies.length,
    });
  }

  // 5. Marketing Contributions
  if (data.marketingContributions.length > 0) {
    cards.push({
      type: "table",
      title: "Marketing Contributions",
      head: ["Market", "Season", "Type", "Value"],
      body: data.marketingContributions.map((mc) => {
        const suffix = mc.valueType === "PERCENTAGE" ? "%" : "";
        return [
          mc.market?.name ?? "All",
          mc.season ? formatSeasonLabel(mc.season.dateFrom, mc.season.dateTo) : "All",
          mc.valueType === "PERCENTAGE" ? "%" : "Fixed",
          `${fmtDecimal(mc.value)}${suffix}`,
        ];
      }),
      columnStyles: { 3: { halign: "right" } },
      estimatedRows: data.marketingContributions.length,
    });
  }

  // 6. Allocation & Release
  if (data.allotments.length > 0) {
    cards.push({
      type: "table",
      title: "Allocation & Release",
      head: ["Room Type", "Season", "Alloc", "Basis"],
      body: data.allotments.map((a) => [
        a.roomType.name,
        a.season ? formatSeasonLabel(a.season.dateFrom, a.season.dateTo) : "All",
        String(a.totalRooms),
        a.basis === "FREE_SALE" ? "Free Sale" : a.basis === "ALLOCATION" ? "Allotment" : a.basis,
      ]),
      estimatedRows: data.allotments.length,
    });
  }

  // 7. Stop Sales
  if (data.stopSales.length > 0) {
    cards.push({
      type: "table",
      title: "Stop Sales",
      head: ["Room Type", "From", "To", "Reason"],
      body: data.stopSales.map((ss) => [
        ss.roomType?.name ?? "All",
        fmtDate(ss.dateFrom), fmtDate(ss.dateTo),
        ss.reason ?? "—",
      ]),
      estimatedRows: data.stopSales.length,
    });
  }

  // 7b. Special Meals
  if (data.specialMeals && data.specialMeals.length > 0) {
    cards.push({
      type: "table",
      title: "Special Meals",
      head: ["Occasion", "From", "To", "Adult", "Child", "Mandatory"],
      body: data.specialMeals.map((sm) => [
        sm.customName ?? (SPECIAL_MEAL_OCCASION_LABELS[sm.occasion] ?? sm.occasion),
        fmtDate(sm.dateFrom), fmtDate(sm.dateTo),
        fmtDecimal(sm.adultPrice),
        sm.childPrice != null ? fmtDecimal(sm.childPrice) : "—",
        sm.mandatory ? "Yes" : "No",
      ]),
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "center" } },
      estimatedRows: data.specialMeals.length,
    });
  }

  // 8. Special Offers
  for (const so of data.specialOffers) {
    const soRows: string[][] = [];
    soRows.push(["Type", OFFER_TYPE_LABELS[so.offerType] ?? so.offerType]);
    if (so.offerType === "FREE_NIGHTS" && so.stayNights && so.payNights) {
      soRows.push(["Free Nights", `Stay ${so.stayNights}, Pay ${so.payNights}`]);
    } else {
      const disc = so.discountType === "PERCENTAGE" ? `${Number(so.discountValue)}%` : fmtDecimal(so.discountValue);
      soRows.push(["Discount", disc]);
    }
    if (so.combinable !== undefined) soRows.push(["Combinable", so.combinable ? "Yes" : "No"]);
    if (so.validFrom || so.validTo) soRows.push(["Stay Dates", `${fmtDate(so.validFrom)} – ${fmtDate(so.validTo)}`]);
    if (so.bookFromDate || so.bookByDate) soRows.push(["Booking Dates", `${fmtDate(so.bookFromDate)} – ${fmtDate(so.bookByDate)}`]);
    if (so.stayDateType) soRows.push(["Stay Date Type", so.stayDateType]);
    if (so.minimumNights) soRows.push(["Min Nights", String(so.minimumNights)]);
    if (so.paymentPct && so.paymentDeadline) soRows.push(["Payment", `${so.paymentPct}% by ${fmtDate(so.paymentDeadline)}`]);
    if (so.roomingListBy) soRows.push(["Rooming List By", fmtDate(so.roomingListBy)]);
    soRows.push(["Active", so.active ? "Yes" : "No"]);
    cards.push({ type: "kv", title: `SPO: ${so.name}`, body: soRows, estimatedRows: soRows.length });
  }

  // ─── Render cards in 2-column grid ───
  if (cards.length > 0) {
    cursorY += 1;
    const CARD_COLS = 2;
    const GAP = 4;
    const cardW = (contentW - (CARD_COLS - 1) * GAP) / CARD_COLS;
    const ROW_HEIGHT_EST = 3.5;
    const CARD_OVERHEAD = 10;

    let colIndex = 0;
    let rowStartY = cursorY;
    let rowMaxBottom = cursorY;

    for (const card of cards) {
      const estH = CARD_OVERHEAD + card.estimatedRows * ROW_HEIGHT_EST;

      if (colIndex === 0 && rowStartY + estH > CONTENT_BOTTOM) {
        doc.addPage();
        rowStartY = HEADER_BOTTOM;
        rowMaxBottom = HEADER_BOTTOM;
        cursorY = HEADER_BOTTOM;
      }

      if (colIndex === 1 && rowStartY + estH > CONTENT_BOTTOM) {
        doc.addPage();
        rowStartY = HEADER_BOTTOM;
        rowMaxBottom = HEADER_BOTTOM;
        cursorY = HEADER_BOTTOM;
        colIndex = 0;
      }

      const cardX = margin.left + colIndex * (cardW + GAP);
      let finalY: number;

      if (card.type === "kv") {
        finalY = drawKvCard(card.title, card.body, cardX, rowStartY, cardW);
      } else {
        finalY = drawCard(card.title, card.head!, card.body, cardX, rowStartY, cardW, { columnStyles: card.columnStyles });
      }

      if (finalY > rowMaxBottom) rowMaxBottom = finalY;

      colIndex++;
      if (colIndex >= CARD_COLS) {
        colIndex = 0;
        rowStartY = rowMaxBottom + GAP;
        rowMaxBottom = rowStartY;
        cursorY = rowStartY;
      }
    }

    if (colIndex > 0) cursorY = rowMaxBottom + GAP;
  }

  // ── Hotel Notes ──
  if (data.hotelNotes) {
    if (cursorY + 14 > CONTENT_BOTTOM) { doc.addPage(); cursorY = HEADER_BOTTOM; }
    cursorY += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text("Hotel Notes", margin.left, cursorY);
    cursorY += 4;
    drawTextBlock(data.hotelNotes);
  }

  // ── Terms & Conditions ──
  if (data.terms) {
    newSectionPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
    doc.text("Terms and Conditions", pageW / 2, cursorY + 2, { align: "center" });
    cursorY += 8;
    drawTextBlock(data.terms);
  }

  function drawTextBlock(text: string): void {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      if (cursorY + 4 > CONTENT_BOTTOM) { doc.addPage(); cursorY = HEADER_BOTTOM; }
      doc.text(line, margin.left, cursorY);
      cursorY += 3.2;
    }
    cursorY += 3;
  }

  // ── Headers + footers on all pages ──
  addHeadersAndFooters();

  return Buffer.from(doc.output("arraybuffer"));
}
