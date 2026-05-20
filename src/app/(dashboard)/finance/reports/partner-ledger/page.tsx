"use client";

import { PartnerLedgerReport } from "@/components/finance/reports/partner-ledger-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function PartnerLedgerPage() {
  return (
    <PermissionGuard permission="finance:report:read">
      <PartnerLedgerReport />
    </PermissionGuard>
  );
}
