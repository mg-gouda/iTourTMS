"use client";

import { useTranslations } from "next-intl";

import { BankStatementForm } from "@/components/finance/bank-statement-form";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewBankStatementPage() {
  const t = useTranslations("finance");
  return (
    <PermissionGuard permission="finance:bankStatement:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("newBankStatement")}
        </h1>
        <p className="text-muted-foreground">
          {t("newBankStatementDesc")}
        </p>
      </div>
      <BankStatementForm />
    </div>
    </PermissionGuard>
  );
}
