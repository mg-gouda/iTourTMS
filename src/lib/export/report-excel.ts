import { format } from "date-fns";

export interface ReportExcelOptions {
  title: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number)[][];
  columnWidths?: number[];
}

export async function exportReportToExcel(options: ReportExcelOptions): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const data: (string | number)[][] = [options.headers, ...options.rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  if (options.columnWidths) {
    ws["!cols"] = options.columnWidths.map((w) => ({ wch: w }));
  } else {
    ws["!cols"] = options.headers.map(() => ({ wch: 18 }));
  }

  XLSX.utils.book_append_sheet(wb, ws, options.sheetName ?? "Report");

  const filename = `${options.title.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
