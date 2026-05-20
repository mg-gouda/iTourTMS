"use client";

import { FiscalPositionForm } from "@/components/finance/fiscal-position-form";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

export default function NewFiscalPositionPage() {
  const t = useTranslations("finance");

  return (
    <PermissionGuard permission="finance:settings:manage">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("newFiscalPosition")}
        </h1>
        <p className="text-muted-foreground">
          {t("newFiscalPositionDesc")}
        </p>
      </div>
      <FiscalPositionForm />
    </div>
    </PermissionGuard>
  );
}
