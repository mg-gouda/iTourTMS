import { format } from "date-fns";

import { CRM_BOOKING_STATUS_LABELS } from "@/lib/constants/crm";

interface BookingListRow {
  code: string;
  status: string;
  travelDate: string | Date;
  paxAdults: number;
  paxChildren: number;
  paxInfants: number;
  totalSelling: unknown;
  currency: string;
  customer: { firstName: string; lastName: string } | null;
  bookedBy: { name: string | null } | null;
  _count: { items: number };
  createdAt: string | Date;
}

export async function exportBookingsListToExcel(
  bookings: BookingListRow[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = [
    "Code",
    "Customer",
    "Travel Date",
    "Adults",
    "Children",
    "Infants",
    "Total Pax",
    "Items",
    "Total Selling",
    "Currency",
    "Status",
    "Booked By",
    "Created",
  ];

  const rows = bookings.map((bk) => [
    bk.code,
    bk.customer ? `${bk.customer.firstName} ${bk.customer.lastName}` : "Walk-in",
    format(new Date(bk.travelDate), "dd MMM yyyy"),
    bk.paxAdults,
    bk.paxChildren,
    bk.paxInfants,
    bk.paxAdults + bk.paxChildren + bk.paxInfants,
    bk._count.items,
    Number(bk.totalSelling ?? 0),
    bk.currency,
    CRM_BOOKING_STATUS_LABELS[bk.status] ?? bk.status,
    bk.bookedBy?.name ?? "",
    format(new Date(bk.createdAt), "dd MMM yyyy"),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet["!cols"] = [
    { wch: 12 }, // Code
    { wch: 24 }, // Customer
    { wch: 14 }, // Travel Date
    { wch: 8 },  // Adults
    { wch: 8 },  // Children
    { wch: 8 },  // Infants
    { wch: 10 }, // Total Pax
    { wch: 6 },  // Items
    { wch: 14 }, // Total Selling
    { wch: 8 },  // Currency
    { wch: 12 }, // Status
    { wch: 18 }, // Booked By
    { wch: 14 }, // Created
  ];

  XLSX.utils.book_append_sheet(wb, sheet, "Bookings");

  const dateStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(wb, `bookings-${dateStr}.xlsx`);
}
