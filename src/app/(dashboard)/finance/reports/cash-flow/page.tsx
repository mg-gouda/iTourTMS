"use client";

import { CashFlowReport } from "@/components/finance/reports/cash-flow-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function CashFlowPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <CashFlowReport />
    </PermissionGuard>
  );
}
