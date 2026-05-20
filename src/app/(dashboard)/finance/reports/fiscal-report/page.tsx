"use client";

import { FiscalReport } from "@/components/finance/reports/fiscal-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function FiscalReportPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <FiscalReport />
    </PermissionGuard>
  );
}
