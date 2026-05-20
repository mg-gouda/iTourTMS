"use client";

import { ExecutiveSummaryReport } from "@/components/finance/reports/executive-summary-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ExecutiveSummaryPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <ExecutiveSummaryReport />
    </PermissionGuard>
  );
}
