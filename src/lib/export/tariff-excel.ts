import { format } from "date-fns";

export interface TariffRateEntry {
  seasonName: string;
  seasonCode: string;
  roomTypeName: string;
  roomTypeCode: string;
  mealBasisName: string;
  mealCode: string;
  baseRate: number;
  markup: number;
  sellingRate: number;
}

export interface TariffExportData {
  tariffName: string;
  contractName: string;
  contractCode: string;
  hotelName?: string;
  tourOperatorName: string;
  tourOperatorCode: string;
  markupRuleName?: string | null;
  markupType?: string;
  markupValue?: number;
  currencyCode: string;
  rateBasis: string;
  generatedAt: string;
  rates: TariffRateEntry[];
}

function fmtDecimal(v: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export async function exportTariffToExcel(data: TariffExportData): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Summary ──────────────────────────────
  const summaryRows: string[][] = [
    ["Tariff", data.tariffName],
    ["Contract", `${data.contractName} (${data.contractCode})`],
    ["Hotel", data.hotelName ?? "—"],
    ["Tour Operator", `${data.tourOperatorName} (${data.tourOperatorCode})`],
    ["Markup Rule", data.markupRuleName ?? "No markup"],
    ["Markup", data.markupType && data.markupValue != null
      ? `${data.markupValue}${data.markupType === "PERCENTAGE" ? "%" : ` ${data.markupType.replace(/_/g, " ").toLowerCase()}`}`
      : "—"],
    ["Currency", data.currencyCode],
    ["Rate Basis", data.rateBasis === "PER_PERSON" ? "Per Person" : "Per Room"],
    ["Generated", format(new Date(data.generatedAt), "dd MMM yyyy HH:mm")],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 16 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ─── Sheet 2: Rates ──────────────────────────────
  const header = ["Season", "Season Code", "Room Type", "Room Code", "Meal Plan", "Meal Code", "Base Rate", "Markup", "Selling Rate"];
  const rateRows: (string | number)[][] = [header];

  for (const r of data.rates) {
    rateRows.push([
      r.seasonName,
      r.seasonCode,
      r.roomTypeName,
      r.roomTypeCode,
      r.mealBasisName,
      r.mealCode,
      Number(fmtDecimal(r.baseRate)),
      Number(fmtDecimal(r.markup)),
      Number(fmtDecimal(r.sellingRate)),
    ]);
  }

  const wsRates = XLSX.utils.aoa_to_sheet(rateRows);
  wsRates["!cols"] = [
    { wch: 18 }, { wch: 10 }, { wch: 22 }, { wch: 10 },
    { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRates, "Rates");

  // ─── Download ────────────────────────────────────
  const filename = `Tariff_${data.contractCode}_${data.tourOperatorCode}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
