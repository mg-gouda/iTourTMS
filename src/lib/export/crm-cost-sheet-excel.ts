import { format } from "date-fns";

import {
  CRM_COST_TYPE_LABELS,
  CRM_COST_CALC_BASIS_LABELS,
  CRM_SEASON_TYPE_LABELS,
} from "@/lib/constants/crm";

interface CostSheetRow {
  label: string;
  seasonType: string;
  validFrom: string | Date;
  validTo: string | Date;
  totalCost: unknown;
  currency: string;
  excursion: { name: string; code: string };
  components: Array<{
    componentType: string;
    description: string | null;
    calcBasis: string;
    unitCost: unknown;
    quantity: number;
    totalCost: unknown;
    supplier: { name: string } | null;
  }>;
}

export async function exportCostSheetsToExcel(
  costSheets: CostSheetRow[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ── Summary sheet ──
  const summaryHeader = [
    "Excursion Code",
    "Excursion Name",
    "Cost Sheet",
    "Season",
    "Valid From",
    "Valid To",
    "Components",
    "Total Cost",
    "Currency",
  ];

  const summaryRows = costSheets.map((cs) => [
    cs.excursion.code,
    cs.excursion.name,
    cs.label,
    CRM_SEASON_TYPE_LABELS[cs.seasonType] ?? cs.seasonType,
    format(new Date(cs.validFrom), "dd MMM yyyy"),
    format(new Date(cs.validTo), "dd MMM yyyy"),
    cs.components.length,
    Number(cs.totalCost ?? 0),
    cs.currency,
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
  summarySheet["!cols"] = [
    { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // ── Components detail sheet ──
  const compHeader = [
    "Excursion Code",
    "Cost Sheet",
    "Type",
    "Description",
    "Supplier",
    "Calc Basis",
    "Unit Cost",
    "Quantity",
    "Total Cost",
    "Currency",
  ];

  const compRows = costSheets.flatMap((cs) =>
    cs.components.map((c) => [
      cs.excursion.code,
      cs.label,
      CRM_COST_TYPE_LABELS[c.componentType] ?? c.componentType,
      c.description ?? "",
      c.supplier?.name ?? "",
      CRM_COST_CALC_BASIS_LABELS[c.calcBasis] ?? c.calcBasis,
      Number(c.unitCost ?? 0),
      c.quantity,
      Number(c.totalCost ?? 0),
      cs.currency,
    ]),
  );

  const compSheet = XLSX.utils.aoa_to_sheet([compHeader, ...compRows]);
  compSheet["!cols"] = [
    { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 24 },
    { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
    { wch: 12 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, compSheet, "Components");

  const dateStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(wb, `crm-cost-sheets-${dateStr}.xlsx`);
}
