"use client";

import { AnalyticReport } from "@/components/finance/reports/analytic-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function AnalyticReportPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <AnalyticReport />
    </PermissionGuard>
  );
}
