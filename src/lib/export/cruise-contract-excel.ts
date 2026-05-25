import * as XLSX from "xlsx";
import { format } from "date-fns";

import {
  CRUISE_CONTRACT_STATUS_LABELS,
  CRUISE_SUPPLEMENT_TYPE_LABELS,
  CRUISE_GALA_MEAL_TYPE_LABELS,
  CRUISE_OFFER_TYPE_LABELS,
  CRUISE_CANCELLATION_CHARGE_TYPE_LABELS,
} from "@/lib/constants/nile-cruises";
import { CHILD_AGE_CATEGORY_LABELS, CHILD_BEDDING_LABELS } from "@/lib/constants/contracting";
import type { CruiseContractPdfData } from "./cruise-contract-pdf";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  return format(new Date(d), "dd MMM yyyy");
}

function fmtNum(v: unknown): number | string {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  return isNaN(n) ? "" : n;
}

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addSheet<T extends Record<string, unknown>>(
  wb: XLSX.WorkBook,
  name: string,
  headers: string[],
  rows: T[],
  rowMapper: (r: T) => (string | number | boolean | null)[]
) {
  const data = [headers, ...rows.map(rowMapper)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Style header row
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) {
      cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0A5A78" }, patternType: "solid" } };
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function generateCruiseContractExcel(data: CruiseContractPdfData): Uint8Array {
  const wb = XLSX.utils.book_new();

  // ── Summary ──────────────────────────────────────────────────────────────
  const summaryRows = [
    ["Code", data.code],
    ["Name", data.name],
    ["Status", (CRUISE_CONTRACT_STATUS_LABELS as Record<string, string>)[data.status] ?? data.status],
    ["Boat", `${data.boat.name} (${data.boat.code})`],
    ["Valid From", fmtDate(data.validFrom)],
    ["Valid To", fmtDate(data.validTo)],
    ["Base Currency", data.baseCurrency],
    ["Rate Basis", data.rateBasis],
    ["Default Release Days", data.defaultReleaseDays],
    ["Includes Full Board", data.includesFullBoard ? "Yes" : "No"],
    ["Includes Sightseeing", data.includesSightseeing ? "Yes" : "No"],
    ["Includes Soft Drinks", data.includesSoftDrinks ? "Yes" : "No"],
    ["Includes Visit Fees", data.includesVisitFees ? "Yes" : "No"],
    ["Includes Transfers", data.includesTransfers ? "Yes" : "No"],
    ["Includes Domestic Flight", data.includesDomesticFlight ? "Yes" : "No"],
    ["Flight Routing", data.flightRouting ?? ""],
    ["Cancellation Policy", data.cancellationPolicy?.name ?? ""],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs["!cols"] = [{ wch: 28 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // ── Seasons ──────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Seasons",
    ["Code", "Name", "Date From", "Date To", "Release Days"],
    data.seasons,
    (s) => [s.code, s.name, fmtDate(s.dateFrom), fmtDate(s.dateTo), s.releaseDays ?? data.defaultReleaseDays]
  );

  // ── Base Rates ────────────────────────────────────────────────────────────
  const cats = data.boat.cabinCategories;
  const rateHeaders = ["Season Code", "Season Name", ...cats.map((c) => c.name), ...cats.map((c) => `${c.name} Single Suppl.`)];
  const rateRows = data.seasons.map((s) => {
    const row: (string | number | boolean | null)[] = [s.code, s.name];
    for (const cat of cats) {
      const r = data.baseRates.find((br) => br.seasonId === s.id && br.cabinCategoryId === cat.id);
      row.push(r ? (fmtNum(r.ratePerPaxPerNight) as number) : "");
    }
    for (const cat of cats) {
      const r = data.baseRates.find((br) => br.seasonId === s.id && br.cabinCategoryId === cat.id);
      row.push(r ? (fmtNum(r.singleSupplement) as number) : "");
    }
    return row;
  });
  const ratesWs = XLSX.utils.aoa_to_sheet([rateHeaders, ...rateRows]);
  XLSX.utils.book_append_sheet(wb, ratesWs, "Base Rates");

  // ── Supplements ──────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Supplements",
    ["Type", "Season", "Cabin Category", "Value Type", "Value", "Per Pax", "Per Night"],
    data.supplements,
    (s) => [
      CRUISE_SUPPLEMENT_TYPE_LABELS[s.type as keyof typeof CRUISE_SUPPLEMENT_TYPE_LABELS] ?? s.type,
      s.seasonId ? (data.seasons.find((ss) => ss.id === s.seasonId)?.name ?? "") : "All",
      s.cabinCategoryId ? (data.boat.cabinCategories.find((c) => c.id === s.cabinCategoryId)?.name ?? "") : "All",
      s.valueType,
      fmtNum(s.value) as number,
      s.perPax ? "Yes" : "No",
      s.perNight ? "Yes" : "No",
    ]
  );

  // ── Offers ────────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Special Offers",
    ["Type", "Name", "Value Type", "Value", "Days Before Departure", "Min Nights", "Combinable", "Active"],
    data.offers,
    (o) => [
      CRUISE_OFFER_TYPE_LABELS[o.type as keyof typeof CRUISE_OFFER_TYPE_LABELS] ?? o.type,
      o.name,
      o.valueType,
      fmtNum(o.value) as number,
      o.daysBeforeDeparture ?? "",
      o.minNights ?? "",
      o.isCombinable ? "Yes" : "No",
      o.active ? "Yes" : "No",
    ]
  );

  // ── Gala Meals ────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Gala Meals",
    ["Type", "Date", "Currency", "Adult Price", "Child Price", "Mandatory"],
    data.galaMeals,
    (g) => [
      CRUISE_GALA_MEAL_TYPE_LABELS[g.type as keyof typeof CRUISE_GALA_MEAL_TYPE_LABELS] ?? g.type,
      g.applicableDate ? fmtDate(g.applicableDate) : "",
      g.currency,
      fmtNum(g.pricePerPax) as number,
      g.childPricePerPax ? (fmtNum(g.childPricePerPax) as number) : "",
      g.isMandatory ? "Yes" : "No",
    ]
  );

  // ── Child Policies ────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Child Policies",
    ["Category", "Age From", "Age To", "Bedding", "Free?", "Discount %", "Fixed Rate", "Max Free Children"],
    data.childPolicies,
    (cp) => [
      CHILD_AGE_CATEGORY_LABELS[cp.category] ?? cp.category,
      cp.ageFrom,
      cp.ageTo,
      CHILD_BEDDING_LABELS[cp.bedding] ?? cp.bedding,
      cp.isFree ? "Yes" : "No",
      cp.discountPercent ? (fmtNum(cp.discountPercent) as number) : "",
      cp.fixedRate ? (fmtNum(cp.fixedRate) as number) : "",
      cp.maxFreeChildren,
    ]
  );

  // ── Cancellation ─────────────────────────────────────────────────────────
  if (data.cancellationPolicy) {
    addSheet(
      wb,
      "Cancellation",
      ["Policy", "Days Before", "Charge Type", "Charge Value"],
      data.cancellationPolicy.tiers,
      (t) => [
        data.cancellationPolicy!.name,
        t.daysBefore,
        CRUISE_CANCELLATION_CHARGE_TYPE_LABELS[t.chargeType as keyof typeof CRUISE_CANCELLATION_CHARGE_TYPE_LABELS] ?? t.chargeType,
        fmtNum(t.chargeValue) as number,
      ]
    );
  }

  // ── Embarkation Days ─────────────────────────────────────────────────────
  const embarkRows: (string | number)[][] = [];
  for (const dur of [3, 4, 7]) {
    const days = data.embarkDays.filter((e) => e.durationNights === dur).map((e) => e.dayOfWeek).sort();
    embarkRows.push([`${dur}-Night`, days.map((d) => DAY_NAMES[d]).join(", ") || "—"]);
  }
  const embarkWs = XLSX.utils.aoa_to_sheet([["Duration", "Embarkation Days"], ...embarkRows]);
  embarkWs["!cols"] = [{ wch: 18 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, embarkWs, "Embarkation Days");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(buf);
}
