"use client";

import { useTranslations } from "next-intl";

import { BankReconciliationView } from "@/components/finance/bank-reconciliation-view";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ReconciliationPage() {
  const t = useTranslations("finance");
  return (
    <PermissionGuard permission="finance:reconciliation:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("bankReconciliation")}
        </h1>
        <p className="text-muted-foreground">
          {t("bankReconciliationDesc")}
        </p>
      </div>
      <BankReconciliationView />
    </div>
    </PermissionGuard>
  );
}
