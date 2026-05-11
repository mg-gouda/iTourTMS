import * as XLSX from "xlsx";
import { format } from "date-fns";

import { OPS_FILE_STATUS_LABELS, OPS_CLIENT_TYPE_LABELS } from "@/lib/constants/tour-ops";

interface PnlFileRow {
  code: string;
  clientType: string;
  guestName?: string | null;
  status: string;
  travelFrom: Date | string;
  travelTo: Date | string;
  adults: number;
  children: number;
  infants: number;
  pnl?: {
    budgetedRevenue: number | string;
    budgetedCost: number | string;
    actualRevenue: number | string;
    actualCost: number | string;
    variance: number | string;
    status: string;
  } | null;
}

export function generatePnlExcel(
  files: PnlFileRow[],
  period?: { from?: string; to?: string }
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData: unknown[][] = [
    ["iTourTMS — P&L Report"],
    [period?.from || period?.to ? `Period: ${period?.from ?? ""} – ${period?.to ?? ""}` : "All Periods"],
    ["Generated:", format(new Date(), "dd MMM yyyy HH:mm")],
    [],
    ["Code", "Client Type", "Guest", "Status", "Travel From", "Travel To", "Pax", "Bud. Revenue", "Bud. Cost", "Bud. Margin", "Act. Revenue", "Act. Cost", "Act. Margin", "Variance", "P&L Status"],
  ];

  let totalBudRev = 0, totalBudCost = 0, totalActRev = 0, totalActCost = 0;

  for (const f of files) {
    const budRev = Number(f.pnl?.budgetedRevenue ?? 0);
    const budCost = Number(f.pnl?.budgetedCost ?? 0);
    const actRev = Number(f.pnl?.actualRevenue ?? 0);
    const actCost = Number(f.pnl?.actualCost ?? 0);
    totalBudRev += budRev;
    totalBudCost += budCost;
    totalActRev += actRev;
    totalActCost += actCost;

    summaryData.push([
      f.code,
      OPS_CLIENT_TYPE_LABELS[f.clientType as keyof typeof OPS_CLIENT_TYPE_LABELS] ?? f.clientType,
      f.guestName ?? "",
      OPS_FILE_STATUS_LABELS[f.status as keyof typeof OPS_FILE_STATUS_LABELS] ?? f.status,
      format(new Date(f.travelFrom), "dd MMM yyyy"),
      format(new Date(f.travelTo), "dd MMM yyyy"),
      f.adults + f.children + f.infants,
      budRev,
      budCost,
      budRev - budCost,
      actRev,
      actCost,
      actRev - actCost,
      Number(f.pnl?.variance ?? 0),
      f.pnl?.status ?? "—",
    ]);
  }

  summaryData.push([]);
  summaryData.push([
    "TOTAL", "", "", "", "", "", "",
    totalBudRev, totalBudCost, totalBudRev - totalBudCost,
    totalActRev, totalActCost, totalActRev - totalActCost,
    (totalActRev - totalActCost) - (totalBudRev - totalBudCost),
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(summaryData);

  ws["!cols"] = [
    { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "P&L Summary");

  return wb;
}

export function downloadPnlExcel(files: PnlFileRow[], period?: { from?: string; to?: string }): void {
  const wb = generatePnlExcel(files, period);
  XLSX.writeFile(wb, `pnl-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}
