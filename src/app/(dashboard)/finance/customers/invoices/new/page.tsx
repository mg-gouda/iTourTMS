"use client";

import { useTranslations } from "next-intl";
import { MoveForm } from "@/components/finance/move-form";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewCustomerInvoicePage() {
  const t = useTranslations("finance");
  return (
    <PermissionGuard permission="finance:partner:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newCustomerInvoice")}</h1>
        <p className="text-muted-foreground">
          {t("newInvoice")}
        </p>
      </div>
      <MoveForm
        moveType="OUT_INVOICE"
        returnPath="/finance/customers/invoices"
      />
    </div>
    </PermissionGuard>
  );
}
