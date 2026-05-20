"use client";

import { Suspense } from "react";

import { GeneralLedgerReport } from "@/components/finance/reports/general-ledger-report";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function GeneralLedgerPage() {
  return (
    <PermissionGuard permission="finance:report:read">
    <Suspense>
      <GeneralLedgerReport />
    </Suspense>
    </PermissionGuard>
  );
}
