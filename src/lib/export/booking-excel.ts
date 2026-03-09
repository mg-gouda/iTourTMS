import { format } from "date-fns";

import {
  CRM_BOOKING_STATUS_LABELS,
} from "@/lib/constants/crm";

export interface BookingExcelData {
  code: string;
  status: string;
  travelDate: string | Date;
  paxAdults: number;
  paxChildren: number;
  paxInfants: number;
  totalCost: number;
  totalSelling: number;
  currency: string;
  notes: string | null;
  createdAt: string | Date;
  customer: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    nationality?: string | null;
  } | null;
  bookedBy: { name: string | null } | null;
  items: Array<{
    label: string;
    excursionName: string;
    excursionCode: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    totalCost: number;
    totalPrice: number;
  }>;
  activities?: Array<{
    type: string;
    subject: string;
    description?: string | null;
    createdAt: string | Date;
  }>;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  return format(new Date(d), "dd MMM yyyy");
}

export async function exportBookingToExcel(data: BookingExcelData): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const totalPax = data.paxAdults + data.paxChildren + data.paxInfants;
  const profit = data.totalSelling - data.totalCost;
  const margin = data.totalSelling > 0 ? (profit / data.totalSelling * 100) : 0;

  // ─── Sheet 1: Summary ──────────────────────────────
  const summaryRows: (string | number)[][] = [
    ["Booking Summary"],
    [],
    ["Code", data.code],
    ["Status", CRM_BOOKING_STATUS_LABELS[data.status] ?? data.status],
    ["Travel Date", fmtDate(data.travelDate)],
    ["Created", fmtDate(data.createdAt)],
    [],
    ["Guest Information"],
    [],
  ];

  if (data.customer) {
    summaryRows.push(["Name", `${data.customer.firstName} ${data.customer.lastName}`]);
    if (data.customer.email) summaryRows.push(["Email", data.customer.email]);
    if (data.customer.phone) summaryRows.push(["Phone", data.customer.phone]);
    if (data.customer.nationality) summaryRows.push(["Nationality", data.customer.nationality]);
  } else {
    summaryRows.push(["Guest", "Walk-in"]);
  }

  summaryRows.push(
    [],
    ["Passengers"],
    [],
    ["Adults", data.paxAdults],
    ["Children", data.paxChildren],
    ["Infants", data.paxInfants],
    ["Total Pax", totalPax],
    [],
    ["Financials"],
    [],
    ["Currency", data.currency],
    ["Total Cost", data.totalCost],
    ["Selling Price", data.totalSelling],
    ["Profit", profit],
    ["Margin %", Number(margin.toFixed(1))],
  );

  if (data.bookedBy?.name) {
    summaryRows.push([], ["Booked By", data.bookedBy.name]);
  }

  if (data.notes) {
    summaryRows.push([], ["Notes"], [], [data.notes]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 16 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // ─── Sheet 2: Items ────────────────────────────────
  const itemsRows: (string | number)[][] = [
    ["#", "Item", "Excursion Code", "Excursion Name", "Qty", "Unit Cost", "Unit Price", "Total Cost", "Total Price", "Item Margin %"],
  ];

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const itemMargin = item.totalPrice > 0
      ? ((item.totalPrice - item.totalCost) / item.totalPrice * 100)
      : 0;
    itemsRows.push([
      i + 1,
      item.label,
      item.excursionCode,
      item.excursionName,
      item.quantity,
      item.unitCost,
      item.unitPrice,
      item.totalCost,
      item.totalPrice,
      Number(itemMargin.toFixed(1)),
    ]);
  }

  // Totals row
  itemsRows.push([
    "",
    "",
    "",
    "TOTALS",
    "",
    "",
    "",
    data.totalCost,
    data.totalSelling,
    Number(margin.toFixed(1)),
  ]);

  const itemsSheet = XLSX.utils.aoa_to_sheet(itemsRows);
  itemsSheet["!cols"] = [
    { wch: 4 },   // #
    { wch: 24 },  // Item
    { wch: 14 },  // Exc Code
    { wch: 30 },  // Exc Name
    { wch: 6 },   // Qty
    { wch: 12 },  // Unit Cost
    { wch: 12 },  // Unit Price
    { wch: 12 },  // Total Cost
    { wch: 12 },  // Total Price
    { wch: 12 },  // Margin
  ];
  XLSX.utils.book_append_sheet(wb, itemsSheet, "Items");

  // ─── Sheet 3: Activities (if any) ──────────────────
  if (data.activities && data.activities.length > 0) {
    const actRows: (string | number)[][] = [
      ["Date", "Type", "Subject", "Description"],
    ];

    for (const act of data.activities) {
      actRows.push([
        fmtDate(act.createdAt),
        act.type,
        act.subject,
        act.description ?? "",
      ]);
    }

    const actSheet = XLSX.utils.aoa_to_sheet(actRows);
    actSheet["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, actSheet, "Activities");
  }

  XLSX.writeFile(wb, `${data.code}.xlsx`);
}
