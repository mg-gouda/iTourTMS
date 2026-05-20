"use client";

import { TaxReport } from "@/components/finance/reports/tax-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function TaxReportPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <TaxReport />
    </PermissionGuard>
  );
}
