"use client";

import { BalanceSheetReport } from "@/components/finance/reports/balance-sheet-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function BalanceSheetPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <BalanceSheetReport />
    </PermissionGuard>
  );
}
