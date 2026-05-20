"use client";

import { ProfitAndLossReport } from "@/components/finance/reports/profit-and-loss-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ProfitAndLossPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <ProfitAndLossReport />
    </PermissionGuard>
  );
}
