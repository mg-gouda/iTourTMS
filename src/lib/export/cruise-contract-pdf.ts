import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  CRUISE_CONTRACT_STATUS_LABELS,
  CRUISE_SUPPLEMENT_TYPE_LABELS,
  CRUISE_GALA_MEAL_TYPE_LABELS,
  CRUISE_OFFER_TYPE_LABELS,
  CRUISE_CANCELLATION_CHARGE_TYPE_LABELS,
} from "@/lib/constants/nile-cruises";
import { CHILD_AGE_CATEGORY_LABELS, CHILD_BEDDING_LABELS } from "@/lib/constants/contracting";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CruiseContractPdfData {
  code: string;
  name: string;
  status: string;
  validFrom: string | Date;
  validTo: string | Date;
  baseCurrency: string;
  rateBasis: string;
  defaultReleaseDays: number;
  includesFullBoard: boolean;
  includesSightseeing: boolean;
  includesSoftDrinks: boolean;
  includesVisitFees: boolean;
  includesTransfers: boolean;
  includesDomesticFlight: boolean;
  flightRouting: string | null;
  termsAndConditions: string | null;
  boat: {
    name: string;
    code: string;
    cabinCategories: Array<{ id: string; name: string; code: string; sortOrder: number }>;
  };
  cancellationPolicy: {
    name: string;
    tiers: Array<{ daysBefore: number; chargeType: string; chargeValue: unknown }>;
  } | null;
  seasons: Array<{ id: string; name: string; code: string; dateFrom: string | Date; dateTo: string | Date; releaseDays: number | null }>;
  baseRates: Array<{ seasonId: string; cabinCategoryId: string; ratePerPaxPerNight: unknown; singleSupplement?: unknown }>;
  supplements: Array<{ type: string; seasonId: string | null; cabinCategoryId: string | null; valueType: string; value: unknown; perPax: boolean; perNight: boolean }>;
  offers: Array<{ type: string; name: string; valueType: string; value: unknown; daysBeforeDeparture: number | null; minNights: number | null; isCombinable: boolean; active: boolean }>;
  galaMeals: Array<{ type: string; applicableDate: string | Date | null; currency: string; pricePerPax: unknown; childPricePerPax: unknown | null; isMandatory: boolean }>;
  childPolicies: Array<{ category: string; ageFrom: number; ageTo: number; bedding: string; isFree: boolean; discountPercent: unknown | null; fixedRate: unknown | null; maxFreeChildren: number }>;
  embarkDays: Array<{ durationNights: number; dayOfWeek: number }>;
}

export interface CruiseContractPdfOptions {
  companyName: string;
  logoBase64?: string | null;
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const BRAND = { r: 10, g: 90, b: 120 };
const BRAND_LIGHT = { r: 235, g: 247, b: 252 };
const ALT_ROW = { r: 247, g: 251, b: 253 };
const WHITE = { r: 255, g: 255, b: 255 };
const TEXT_DARK = { r: 20, g: 30, b: 40 };
const TEXT_MUTED = { r: 110, g: 120, b: 130 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy");
}

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return isNaN(n) ? "—" : new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function embarkDaysLabel(days: number[]): string {
  if (days.length === 0) return "—";
  return days.sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(", ");
}

// ---------------------------------------------------------------------------
// Header / Footer
// ---------------------------------------------------------------------------

function addHeadersAndFooters(doc: jsPDF, title: string, opts: CruiseContractPdfOptions): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // header band
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(0, 0, W, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(opts.companyName.toUpperCase(), 10, 9);
    doc.setFont("helvetica", "normal");
    doc.text(title, W / 2, 9, { align: "center" });
    doc.text(`Page ${i} of ${pages}`, W - 10, 9, { align: "right" });

    // footer
    doc.setFillColor(240, 240, 240);
    doc.rect(0, H - 10, W, 10, "F");
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.setFontSize(7);
    doc.text(`Generated ${format(new Date(), "dd MMM yyyy HH:mm")}`, 10, H - 3);
  }
}

// ---------------------------------------------------------------------------
// Section helpers
// ---------------------------------------------------------------------------

let cursorY = 20;

function section(doc: jsPDF, title: string): void {
  const W = doc.internal.pageSize.getWidth();
  if (cursorY > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFillColor(BRAND_LIGHT.r, BRAND_LIGHT.g, BRAND_LIGHT.b);
  doc.rect(10, cursorY, W - 20, 8, "F");
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 14, cursorY + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  cursorY += 10;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateCruiseContractPdf(
  data: CruiseContractPdfData,
  opts: CruiseContractPdfOptions
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  cursorY = 20;

  // ── Contract Summary Card ─────────────────────────────────────────────────
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(10, cursorY, W - 20, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.name, 15, cursorY + 9);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Code: ${data.code}`, 15, cursorY + 16);
  doc.text(`Boat: ${data.boat.name} (${data.boat.code})`, 15, cursorY + 22);
  doc.text(`Status: ${(CRUISE_CONTRACT_STATUS_LABELS as Record<string, string>)[data.status] ?? data.status}`, 15, cursorY + 28);
  doc.text(`Valid: ${fmtDate(data.validFrom)} → ${fmtDate(data.validTo)}`, W / 2, cursorY + 16);
  doc.text(`Currency: ${data.baseCurrency}  |  Rate Basis: ${data.rateBasis}`, W / 2, cursorY + 22);
  doc.text(`Release Days: ${data.defaultReleaseDays}`, W / 2, cursorY + 28);
  cursorY += 36;

  // Inclusions row
  const inclusions: string[] = [];
  if (data.includesFullBoard) inclusions.push("Full Board");
  if (data.includesSightseeing) inclusions.push("Sightseeing");
  if (data.includesSoftDrinks) inclusions.push("Soft Drinks");
  if (data.includesVisitFees) inclusions.push("Visit Fees");
  if (data.includesTransfers) inclusions.push("Transfers");
  if (data.includesDomesticFlight) inclusions.push(`Domestic Flight${data.flightRouting ? ` (${data.flightRouting})` : ""}`);
  if (inclusions.length > 0) {
    doc.setFillColor(240, 248, 240);
    doc.rect(10, cursorY, W - 20, 8, "F");
    doc.setTextColor(30, 100, 30);
    doc.setFontSize(8);
    doc.text(`Inclusions: ${inclusions.join("  ·  ")}`, 14, cursorY + 5.5);
    doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
    cursorY += 12;
  }

  // ── Seasons ───────────────────────────────────────────────────────────────
  if (data.seasons.length > 0) {
    section(doc, "Seasons");
    autoTable(doc, {
      startY: cursorY,
      margin: { left: 10, right: 10 },
      head: [["Code", "Name", "Date From", "Date To", "Release Days"]],
      body: data.seasons.map((s) => [s.code, s.name, fmtDate(s.dateFrom), fmtDate(s.dateTo), s.releaseDays ?? data.defaultReleaseDays]),
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Base Rates Matrix ─────────────────────────────────────────────────────
  if (data.baseRates.length > 0 && data.seasons.length > 0) {
    section(doc, `Base Rates (${data.baseCurrency} per pax/night)`);
    const cats = data.boat.cabinCategories;
    const head = [["Season", ...cats.map((c) => c.name)]];
    const body = data.seasons.map((s) => {
      const row: string[] = [s.name];
      for (const cat of cats) {
        const r = data.baseRates.find((br) => br.seasonId === s.id && br.cabinCategoryId === cat.id);
        row.push(r ? fmtNum(r.ratePerPaxPerNight) : "—");
      }
      return row;
    });
    autoTable(doc, {
      startY: cursorY,
      margin: { left: 10, right: 10 },
      head,
      body,
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Supplements ──────────────────────────────────────────────────────────
  if (data.supplements.length > 0) {
    section(doc, "Supplements & Reductions");
    autoTable(doc, {
      startY: cursorY,
      margin: { left: 10, right: 10 },
      head: [["Type", "Season", "Cabin Category", "Value Type", "Value", "Per Pax", "Per Night"]],
      body: data.supplements.map((s) => [
        CRUISE_SUPPLEMENT_TYPE_LABELS[s.type as keyof typeof CRUISE_SUPPLEMENT_TYPE_LABELS] ?? s.type,
        s.seasonId ? (data.seasons.find((ss) => ss.id === s.seasonId)?.name ?? "—") : "All",
        s.cabinCategoryId ? (data.boat.cabinCategories.find((c) => c.id === s.cabinCategoryId)?.name ?? "—") : "All",
        s.valueType,
        fmtNum(s.value),
        s.perPax ? "Yes" : "No",
        s.perNight ? "Yes" : "No",
      ]),
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Special Offers ────────────────────────────────────────────────────────
  if (data.offers.length > 0) {
    section(doc, "Special Offers");
    autoTable(doc, {
      startY: cursorY,
      margin: { left: 10, right: 10 },
      head: [["Type", "Name", "Value Type", "Value", "Days Before", "Min Nights", "Combinable", "Active"]],
      body: data.offers.map((o) => [
        CRUISE_OFFER_TYPE_LABELS[o.type as keyof typeof CRUISE_OFFER_TYPE_LABELS] ?? o.type,
        o.name,
        o.valueType,
        fmtNum(o.value),
        o.daysBeforeDeparture ?? "—",
        o.minNights ?? "—",
        o.isCombinable ? "Yes" : "No",
        o.active ? "Yes" : "No",
      ]),
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Gala Meals ────────────────────────────────────────────────────────────
  if (data.galaMeals.length > 0) {
    section(doc, "Gala Meals & Special Events");
    autoTable(doc, {
      startY: cursorY,
      margin: { left: 10, right: 10 },
      head: [["Type", "Date", "Currency", "Adult Price", "Child Price", "Mandatory"]],
      body: data.galaMeals.map((g) => [
        CRUISE_GALA_MEAL_TYPE_LABELS[g.type as keyof typeof CRUISE_GALA_MEAL_TYPE_LABELS] ?? g.type,
        g.applicableDate ? fmtDate(g.applicableDate) : "—",
        g.currency,
        fmtNum(g.pricePerPax),
        g.childPricePerPax ? fmtNum(g.childPricePerPax) : "—",
        g.isMandatory ? "Yes" : "No",
      ]),
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Child Policies ────────────────────────────────────────────────────────
  if (data.childPolicies.length > 0) {
    section(doc, "Child Policies");
    autoTable(doc, {
      startY: cursorY,
      margin: { left: 10, right: 10 },
      head: [["Category", "Age Range", "Bedding", "Free?", "Discount %", "Fixed Rate", "Max Free"]],
      body: data.childPolicies.map((cp) => [
        CHILD_AGE_CATEGORY_LABELS[cp.category] ?? cp.category,
        `${cp.ageFrom}–${cp.ageTo} yrs`,
        CHILD_BEDDING_LABELS[cp.bedding] ?? cp.bedding,
        cp.isFree ? "Yes" : "No",
        cp.discountPercent ? `${fmtNum(cp.discountPercent)}%` : "—",
        cp.fixedRate ? fmtNum(cp.fixedRate) : "—",
        cp.maxFreeChildren,
      ]),
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Cancellation Policy ───────────────────────────────────────────────────
  if (data.cancellationPolicy && data.cancellationPolicy.tiers.length > 0) {
    section(doc, `Cancellation Policy: ${data.cancellationPolicy.name}`);
    autoTable(doc, {
      startY: cursorY,
      margin: { left: 10, right: 10 },
      head: [["Days Before Departure", "Charge Type", "Charge Value"]],
      body: data.cancellationPolicy.tiers.map((t) => [
        t.daysBefore === 0 ? "Day of departure / No-show" : `${t.daysBefore} days`,
        CRUISE_CANCELLATION_CHARGE_TYPE_LABELS[t.chargeType as keyof typeof CRUISE_CANCELLATION_CHARGE_TYPE_LABELS] ?? t.chargeType,
        fmtNum(t.chargeValue),
      ]),
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Embarkation Days ─────────────────────────────────────────────────────
  const durations = [3, 4, 7];
  const embarkHasDays = durations.some((d) => data.embarkDays.some((e) => e.durationNights === d));
  if (embarkHasDays) {
    section(doc, "Embarkation Days by Duration");
    autoTable(doc, {
      startY: cursorY,
      margin: { left: 10, right: 10 },
      head: [["Duration", "Embarkation Days"]],
      body: durations.map((dur) => [
        `${dur}-Night Cruise`,
        embarkDaysLabel(data.embarkDays.filter((e) => e.durationNights === dur).map((e) => e.dayOfWeek)),
      ]),
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 50 } },
      alternateRowStyles: { fillColor: [ALT_ROW.r, ALT_ROW.g, ALT_ROW.b] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Terms & Conditions ────────────────────────────────────────────────────
  if (data.termsAndConditions) {
    doc.addPage();
    cursorY = 20;
    section(doc, "Terms & Conditions");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
    const lines = doc.splitTextToSize(data.termsAndConditions, W - 25);
    doc.text(lines, 12, cursorY);
  }

  addHeadersAndFooters(doc, `${data.code} — ${data.name}`, opts);
  return doc.output("arraybuffer") as unknown as Uint8Array;
}
