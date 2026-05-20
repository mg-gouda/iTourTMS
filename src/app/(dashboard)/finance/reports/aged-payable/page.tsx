"use client";

import { AgedReport } from "@/components/finance/reports/aged-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function AgedPayablePage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <AgedReport reportType="payable" />
    </PermissionGuard>
  );
}
