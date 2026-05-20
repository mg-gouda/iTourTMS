"use client";

import { TrialBalanceReport } from "@/components/finance/reports/trial-balance-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function TrialBalancePage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <TrialBalanceReport />
    </PermissionGuard>
  );
}
