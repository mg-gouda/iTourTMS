"use client";

import { InvoiceAnalysisReport } from "@/components/finance/reports/invoice-analysis-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function InvoiceAnalysisPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <InvoiceAnalysisReport />
    </PermissionGuard>
  );
}
