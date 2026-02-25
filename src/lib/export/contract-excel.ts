import { format } from "date-fns";

import {
  ALLOCATION_BASIS_LABELS,
  CANCELLATION_CHARGE_TYPE_LABELS,
  CHILD_AGE_CATEGORY_LABELS,
  CONTRACT_STATUS_LABELS,
  OFFER_TYPE_LABELS,
  RATE_BASIS_LABELS,
  SPECIAL_MEAL_OCCASION_LABELS,
  SUPPLEMENT_TYPE_LABELS,
} from "@/lib/constants/contracting";
import { formatSeasonLabel } from "@/lib/utils";

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
  travelFrom?: string | Date | null;
  travelTo?: string | Date | null;
  terms: string | null;
  hotelNotes?: string | null;
  internalNotes?: string | null;
  hotel: { name: string; code: string };
  baseCurrency: { code: string; name: string };
  baseRoomType: { name: string; code: string };
  baseMealBasis: { name: string; mealCode: string };
  seasons: Array<{
    id: string;
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
    season: { id: string; dateFrom: string | Date; dateTo: string | Date };
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
    minimumNights: number;
    active: boolean;
    stayNights: number | null;
    payNights: number | null;
    bookFromDate: string | Date | null;
    stayDateType: string | null;
    paymentPct: number | null;
    paymentDeadline: string | Date | null;
    roomingListBy: string | Date | null;
  }>;
  allotments: Array<{
    totalRooms: number;
    freeSale: boolean;
    basis?: string;
    roomType: { name: string; code: string };
  }>;
  stopSales?: Array<{
    roomType: { name: string } | null;
    dateFrom: string | Date;
    dateTo: string | Date;
    reason: string | null;
  }>;
  markets?: Array<{
    market: { name: string; code: string };
  }>;
  marketingContributions?: Array<{
    market: { name: string } | null;
    season: { dateFrom: string | Date; dateTo: string | Date } | null;
    valueType: string;
    value: unknown;
    notes: string | null;
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
    ["Travel From", fmtDate(data.travelFrom)],
    ["Travel To", fmtDate(data.travelTo)],
    [
      "Markets",
      data.markets && data.markets.length > 0
        ? data.markets.map((m) => m.market.name).join(", ")
        : "All Markets",
    ],
  ];
  if (data.hotelNotes) {
    summaryRows.push([], ["Hotel Notes", data.hotelNotes]);
  }
  if (data.internalNotes) {
    summaryRows.push([], ["Internal Notes", data.internalNotes]);
  }
  if (data.terms) {
    summaryRows.push([], ["Terms", data.terms]);
  }
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 18 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ─── Sheet 2: Seasons ────────────────────────────────
  if (data.seasons.length > 0) {
    const seasonRows: (string | number)[][] = [
      ["Season", "Date From", "Date To", "Release Days", "Min Stay"],
      ...data.seasons.map((s) => [
        formatSeasonLabel(s.dateFrom, s.dateTo),
        fmtDate(s.dateFrom),
        fmtDate(s.dateTo),
        s.releaseDays,
        s.minimumStay,
      ]),
    ];
    const wsSeasons = XLSX.utils.aoa_to_sheet(seasonRows);
    wsSeasons["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSeasons, "Seasons");
  }

  // ─── Sheet 3: Base Rates ─────────────────────────────
  if (data.baseRates.length > 0) {
    const rateRows: (string | number)[][] = [
      ["Season", "Rate", "Single", "Double", "Triple"],
      ...data.baseRates.map((br) => [
        formatSeasonLabel(br.season.dateFrom, br.season.dateTo),
        num(br.rate),
        num(br.singleRate),
        num(br.doubleRate),
        num(br.tripleRate),
      ]),
    ];
    const wsRates = XLSX.utils.aoa_to_sheet(rateRows);
    wsRates["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsRates, "Base Rates");
  }

  // ─── Sheet 4: Supplements ────────────────────────────
  if (data.supplements.length > 0) {
    const suppRows: (string | number)[][] = [
      ["Type", "Room Type", "Meal Basis", "Label", "Value", "Value Type", "Reduction", "Per Person", "Per Night"],
      ...data.supplements.map((s) => [
        SUPPLEMENT_TYPE_LABELS[s.supplementType] ?? s.supplementType,
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
      { wch: 14 }, { wch: 18 }, { wch: 18 },
      { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSupp, "Supplements");
  }

  // ─── Sheet 5: Special Offers ─────────────────────────
  if (data.specialOffers.length > 0) {
    const offerRows: (string | number)[][] = [
      ["Name", "Type", "Discount Type", "Discount Value", "Valid From", "Valid To", "Book By", "Min Nights", "Stay/Pay", "Book From", "Stay Date Type", "Payment %", "Payment Deadline", "Rooming List By", "Active"],
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
        fmtDate(so.bookFromDate),
        so.stayDateType ?? "",
        so.paymentPct ?? "",
        fmtDate(so.paymentDeadline),
        fmtDate(so.roomingListBy),
        so.active ? "Yes" : "No",
      ]),
    ];
    const wsOffers = XLSX.utils.aoa_to_sheet(offerRows);
    wsOffers["!cols"] = [
      { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOffers, "Special Offers");
  }

  // ─── Sheet 6: Allotments ─────────────────────────────
  if (data.allotments.length > 0) {
    const allotRows: (string | number)[][] = [
      ["Room Type", "Total Rooms", "Free Sale", "Basis"],
      ...data.allotments.map((a) => [
        a.roomType.name,
        a.totalRooms,
        a.freeSale ? "Yes" : "No",
        a.basis ? (ALLOCATION_BASIS_LABELS[a.basis] ?? a.basis) : "",
      ]),
    ];
    const wsAllot = XLSX.utils.aoa_to_sheet(allotRows);
    wsAllot["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
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

  // ─── Sheet 9: Stop Sales ────────────────────────────
  if (data.stopSales && data.stopSales.length > 0) {
    const ssRows: (string | number)[][] = [
      ["Room Type", "Date From", "Date To", "Reason"],
      ...data.stopSales.map((ss) => [
        ss.roomType?.name ?? "All Room Types",
        fmtDate(ss.dateFrom),
        fmtDate(ss.dateTo),
        ss.reason ?? "",
      ]),
    ];
    const wsSS = XLSX.utils.aoa_to_sheet(ssRows);
    wsSS["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSS, "Stop Sales");
  }

  // ─── Sheet 10: Marketing Contributions ─────────────
  if (data.marketingContributions && data.marketingContributions.length > 0) {
    const mcRows: (string | number)[][] = [
      ["Market", "Season", "Type", "Value", "Notes"],
      ...data.marketingContributions.map((mc) => {
        const suffix = mc.valueType === "PERCENTAGE" ? "%" : "";
        return [
          mc.market?.name ?? "All Markets",
          mc.season
            ? formatSeasonLabel(mc.season.dateFrom, mc.season.dateTo)
            : "All Seasons",
          mc.valueType === "PERCENTAGE" ? "Percentage" : "Fixed",
          `${num(mc.value)}${suffix}`,
          mc.notes ?? "",
        ];
      }),
    ];
    const wsMC = XLSX.utils.aoa_to_sheet(mcRows);
    wsMC["!cols"] = [{ wch: 20 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsMC, "Marketing");
  }

  // ─── Sheet 11: Special Meals ───────────────────────
  if (data.specialMeals && data.specialMeals.length > 0) {
    const smRows: (string | number)[][] = [
      ["Occasion", "Name", "Date From", "Date To", "Mandatory", "Adult", "Child", "Teen", "Infant", "Excl. Meals", "Notes"],
      ...data.specialMeals.map((sm) => [
        SPECIAL_MEAL_OCCASION_LABELS[sm.occasion] ?? sm.occasion,
        sm.customName ?? "",
        fmtDate(sm.dateFrom),
        fmtDate(sm.dateTo),
        sm.mandatory ? "Yes" : "No",
        num(sm.adultPrice),
        sm.childPrice != null ? num(sm.childPrice) : "",
        sm.teenPrice != null ? num(sm.teenPrice) : "",
        sm.infantPrice != null ? num(sm.infantPrice) : "",
        sm.excludedMealBases ?? "",
        sm.notes ?? "",
      ]),
    ];
    const wsSM = XLSX.utils.aoa_to_sheet(smRows);
    wsSM["!cols"] = [
      { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 16 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSM, "Special Meals");
  }

  // ─── Download ────────────────────────────────────────
  const filename = `${data.code}_v${data.version}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
