"use client";

import { AccountForm } from "@/components/finance/account-form";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

export default function NewAccountPage() {
  const t = useTranslations("finance");

  return (
    <PermissionGuard permission="finance:account:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newAccount")}</h1>
        <p className="text-muted-foreground">
          {t("newAccountDesc")}
        </p>
      </div>
      <AccountForm />
    </div>
    </PermissionGuard>
  );
}
