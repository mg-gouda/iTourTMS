import { format } from "date-fns";

import {
  CRM_LEAD_SOURCE_LABELS,
  CRM_LEAD_STATUS_LABELS,
} from "@/lib/constants/crm";

interface LeadRow {
  code: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  expectedRevenue: unknown;
  currency: string;
  assignedTo: { name: string | null } | null;
  createdAt: string | Date;
}

export async function exportLeadsToExcel(leads: LeadRow[]): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = [
    "Code",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Company",
    "Source",
    "Status",
    "Expected Revenue",
    "Currency",
    "Assigned To",
    "Created",
  ];

  const rows = leads.map((l) => [
    l.code,
    l.firstName,
    l.lastName,
    l.email ?? "",
    l.phone ?? "",
    l.company ?? "",
    CRM_LEAD_SOURCE_LABELS[l.source] ?? l.source,
    CRM_LEAD_STATUS_LABELS[l.status] ?? l.status,
    Number(l.expectedRevenue ?? 0),
    l.currency,
    l.assignedTo?.name ?? "",
    format(new Date(l.createdAt), "dd MMM yyyy"),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet["!cols"] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 8 },
    { wch: 18 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, sheet, "Leads");

  const dateStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(wb, `crm-leads-${dateStr}.xlsx`);
}
