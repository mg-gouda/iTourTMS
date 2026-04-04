import { format } from "date-fns";

import { TT_DRIVER_STATUS_LABELS } from "@/lib/constants/traffic";

interface DriverReportRow {
  name: string;
  status: string;
  licenseNumber: string | null;
  phone: string | null;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  noShowJobs: number;
}

export async function exportDriverReportToExcel(
  drivers: DriverReportRow[],
  dateRange?: { from?: string; to?: string },
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = [
    "Driver",
    "Status",
    "License",
    "Phone",
    "Total Jobs",
    "Completed",
    "Cancelled",
    "No Show",
    "Completion Rate (%)",
  ];

  const rows = drivers.map((d) => [
    d.name,
    TT_DRIVER_STATUS_LABELS[d.status] ?? d.status,
    d.licenseNumber ?? "",
    d.phone ?? "",
    d.totalJobs,
    d.completedJobs,
    d.cancelledJobs,
    d.noShowJobs,
    d.totalJobs > 0
      ? ((d.completedJobs / d.totalJobs) * 100).toFixed(1)
      : "0.0",
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([
    [`Driver Performance Report${dateRange?.from ? ` (${dateRange.from} to ${dateRange.to})` : ""}`],
    [],
    header,
    ...rows,
  ]);
  sheet["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, sheet, "Driver Performance");

  const dateStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(wb, `driver-performance-${dateStr}.xlsx`);
}
