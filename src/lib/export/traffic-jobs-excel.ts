import { format } from "date-fns";

import {
  TT_SERVICE_TYPE_LABELS,
  TT_JOB_STATUS_LABELS,
} from "@/lib/constants/traffic";

interface JobRow {
  code: string;
  serviceType: string;
  status: string;
  serviceDate: string | Date;
  serviceTime: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  guestName: string | null;
  flightNo: string | null;
  pax: number;
  hotel: { name: string } | null;
  vehicle: { plateNumber: string } | null;
  vehicleType: { name: string } | null;
  driver: { name: string } | null;
  createdAt: string | Date;
}

export async function exportTrafficJobsToExcel(jobs: JobRow[]): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = [
    "Code",
    "Service Type",
    "Status",
    "Date",
    "Time",
    "Guest",
    "Flight",
    "Pax",
    "Hotel",
    "Pickup",
    "Dropoff",
    "Vehicle",
    "Plate",
    "Driver",
    "Created",
  ];

  const rows = jobs.map((j) => [
    j.code,
    TT_SERVICE_TYPE_LABELS[j.serviceType] ?? j.serviceType,
    TT_JOB_STATUS_LABELS[j.status] ?? j.status,
    format(new Date(j.serviceDate), "dd MMM yyyy"),
    j.serviceTime ?? "",
    j.guestName ?? "",
    j.flightNo ?? "",
    j.pax,
    j.hotel?.name ?? "",
    j.pickupLocation ?? "",
    j.dropoffLocation ?? "",
    j.vehicleType?.name ?? "",
    j.vehicle?.plateNumber ?? "",
    j.driver?.name ?? "",
    format(new Date(j.createdAt), "dd MMM yyyy"),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet["!cols"] = [
    { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 8 },
    { wch: 22 }, { wch: 10 }, { wch: 6 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 12 },
    { wch: 18 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, sheet, "Traffic Jobs");

  const dateStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(wb, `traffic-jobs-${dateStr}.xlsx`);
}
