import { format } from "date-fns";

import {
  CRM_OPPORTUNITY_STAGE_LABELS,
} from "@/lib/constants/crm";

interface OpportunityRow {
  title: string;
  stage: string;
  expectedRevenue: unknown;
  probability: number | null;
  currency: string;
  expectedClose: string | Date | null;
  owner: { name: string | null } | null;
  lead: { code: string; firstName: string; lastName: string } | null;
  createdAt: string | Date;
}

export async function exportPipelineToExcel(
  opportunities: OpportunityRow[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = [
    "Title",
    "Stage",
    "Expected Revenue",
    "Probability (%)",
    "Currency",
    "Expected Close",
    "Lead Code",
    "Lead Name",
    "Owner",
    "Created",
  ];

  const rows = opportunities.map((o) => [
    o.title,
    CRM_OPPORTUNITY_STAGE_LABELS[o.stage] ?? o.stage,
    Number(o.expectedRevenue ?? 0),
    o.probability ?? "",
    o.currency,
    o.expectedClose ? format(new Date(o.expectedClose), "dd MMM yyyy") : "",
    o.lead?.code ?? "",
    o.lead ? `${o.lead.firstName} ${o.lead.lastName}` : "",
    o.owner?.name ?? "",
    format(new Date(o.createdAt), "dd MMM yyyy"),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet["!cols"] = [
    { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 22 },
    { wch: 18 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, sheet, "Pipeline");

  const dateStr = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(wb, `crm-pipeline-${dateStr}.xlsx`);
}
