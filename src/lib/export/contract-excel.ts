import { format } from "date-fns";

import {
  CONTRACT_STATUS_LABELS,
  RATE_BASIS_LABELS,
  SUPPLEMENT_TYPE_LABELS,
  OFFER_TYPE_LABELS,
  CHILD_AGE_CATEGORY_LABELS,
  CANCELLATION_CHARGE_TYPE_LABELS,
} from "@/lib/constants/contracting";

// ---------------------------------------------------------------------------
// Types — mirrors the getForExport tRPC output
// ---------------------------------------------------------------------------

interface ExportData {
  name: string;
  code: string;
  status: string;
  version: number;
  rateBasis: string;
  minimumStay: number;
  maximumStay: number | null;
  validFrom: string | Date;
  validTo: string | Date;
  terms: string | null;
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
    minimumStay: number;
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
    season: { code: string };
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
    minimumNights: number;
    active: boolean;
    stayNights: number | null;
    payNights: number | null;
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  return format(new Date(d), "dd MMM yyyy");
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

// ---------------------------------------------------------------------------
// Export Function
// ---------------------------------------------------------------------------

export async function exportContractToExcel(data: ExportData): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Summary ────────────────────────────────
  const summaryRows: (string | number)[][] = [
    ["Contract Summary"],
    [],
    ["Name", data.name],
    ["Code", data.code],
    ["Version", data.version],
    ["Status", CONTRACT_STATUS_LABELS[data.status] ?? data.status],
    ["Hotel", `${data.hotel.name} (${data.hotel.code})`],
    ["Valid From", fmtDate(data.validFrom)],
    ["Valid To", fmtDate(data.validTo)],
    ["Rate Basis", RATE_BASIS_LABELS[data.rateBasis] ?? data.rateBasis],
    ["Currency", `${data.baseCurrency.code} — ${data.baseCurrency.name}`],
    ["Base Room Type", `${data.baseRoomType.name} (${data.baseRoomType.code})`],
    ["Base Meal Basis", `${data.baseMealBasis.name} (${data.baseMealBasis.mealCode})`],
    ["Min Stay", data.minimumStay],
    ["Max Stay", data.maximumStay ?? ""],
  ];
  if (data.terms) {
    summaryRows.push([], ["Terms", data.terms]);
  }
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 18 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ─── Sheet 2: Seasons ────────────────────────────────
  if (data.seasons.length > 0) {
    const seasonRows: (string | number)[][] = [
      ["Code", "Name", "Date From", "Date To", "Release Days", "Min Stay"],
      ...data.seasons.map((s) => [
        s.code,
        s.name,
        fmtDate(s.dateFrom),
        fmtDate(s.dateTo),
        s.releaseDays,
        s.minimumStay,
      ]),
    ];
    const wsSeasons = XLSX.utils.aoa_to_sheet(seasonRows);
    wsSeasons["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSeasons, "Seasons");
  }

  // ─── Sheet 3: Base Rates ─────────────────────────────
  if (data.baseRates.length > 0) {
    const rateRows: (string | number)[][] = [
      ["Season Code", "Season Name", "Rate", "Single", "Double", "Triple"],
      ...data.baseRates.map((br) => [
        br.season.code,
        br.season.name,
        num(br.rate),
        num(br.singleRate),
        num(br.doubleRate),
        num(br.tripleRate),
      ]),
    ];
    const wsRates = XLSX.utils.aoa_to_sheet(rateRows);
    wsRates["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsRates, "Base Rates");
  }

  // ─── Sheet 4: Supplements ────────────────────────────
  if (data.supplements.length > 0) {
    const suppRows: (string | number)[][] = [
      ["Type", "Season", "Room Type", "Meal Basis", "Label", "Value", "Value Type", "Reduction", "Per Person", "Per Night"],
      ...data.supplements.map((s) => [
        SUPPLEMENT_TYPE_LABELS[s.supplementType] ?? s.supplementType,
        s.season.code,
        s.roomType?.name ?? "",
        s.mealBasis?.name ?? "",
        s.label ?? "",
        num(s.value),
        s.valueType,
        s.isReduction ? "Yes" : "No",
        s.perPerson ? "Yes" : "No",
        s.perNight ? "Yes" : "No",
      ]),
    ];
    const wsSupp = XLSX.utils.aoa_to_sheet(suppRows);
    wsSupp["!cols"] = [
      { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
      { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSupp, "Supplements");
  }

  // ─── Sheet 5: Special Offers ─────────────────────────
  if (data.specialOffers.length > 0) {
    const offerRows: (string | number)[][] = [
      ["Name", "Type", "Discount Type", "Discount Value", "Valid From", "Valid To", "Book By", "Min Nights", "Stay/Pay", "Active"],
      ...data.specialOffers.map((so) => [
        so.name,
        OFFER_TYPE_LABELS[so.offerType] ?? so.offerType,
        so.discountType,
        num(so.discountValue),
        fmtDate(so.validFrom),
        fmtDate(so.validTo),
        fmtDate(so.bookByDate),
        so.minimumNights,
        so.stayNights && so.payNights ? `${so.stayNights}/${so.payNights}` : "",
        so.active ? "Yes" : "No",
      ]),
    ];
    const wsOffers = XLSX.utils.aoa_to_sheet(offerRows);
    wsOffers["!cols"] = [
      { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      { wch: 10 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOffers, "Special Offers");
  }

  // ─── Sheet 6: Allotments ─────────────────────────────
  if (data.allotments.length > 0) {
    const allotRows: (string | number)[][] = [
      ["Season", "Room Type", "Total Rooms", "Free Sale"],
      ...data.allotments.map((a) => [
        a.season.code,
        a.roomType.name,
        a.totalRooms,
        a.freeSale ? "Yes" : "No",
      ]),
    ];
    const wsAllot = XLSX.utils.aoa_to_sheet(allotRows);
    wsAllot["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsAllot, "Allotments");
  }

  // ─── Sheet 7: Child Policies ─────────────────────────
  if (data.childPolicies.length > 0) {
    const childRows: (string | number)[][] = [
      ["Category", "Age From", "Age To", "Label", "Free in Sharing", "Max Free/Room", "Extra Bed", "Meals Included"],
      ...data.childPolicies.map((cp) => [
        CHILD_AGE_CATEGORY_LABELS[cp.category] ?? cp.category,
        cp.ageFrom,
        cp.ageTo,
        cp.label ?? "",
        cp.freeInSharing ? "Yes" : "No",
        cp.maxFreePerRoom,
        cp.extraBedAllowed ? "Yes" : "No",
        cp.mealsIncluded ? "Yes" : "No",
      ]),
    ];
    const wsChild = XLSX.utils.aoa_to_sheet(childRows);
    wsChild["!cols"] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 },
      { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsChild, "Child Policies");
  }

  // ─── Sheet 8: Cancellation ───────────────────────────
  if (data.cancellationPolicies.length > 0) {
    const cancelRows: (string | number)[][] = [
      ["Days Before", "Charge Type", "Charge Value", "Description"],
      ...data.cancellationPolicies.map((cp) => [
        cp.daysBefore,
        CANCELLATION_CHARGE_TYPE_LABELS[cp.chargeType] ?? cp.chargeType,
        cp.chargeType === "FIRST_NIGHT" ? "First Night" : num(cp.chargeValue),
        cp.description ?? "",
      ]),
    ];
    const wsCancel = XLSX.utils.aoa_to_sheet(cancelRows);
    wsCancel["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsCancel, "Cancellation");
  }

  // ─── Download ────────────────────────────────────────
  const filename = `${data.code}_v${data.version}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
