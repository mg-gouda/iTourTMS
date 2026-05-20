"use client";

import { useTranslations } from "next-intl";

import { BatchPaymentForm } from "@/components/finance/batch-payment-form";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewBatchPaymentPage() {
  const t = useTranslations("finance");
  return (
    <PermissionGuard permission="finance:payment:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("newBatchPayment")}
        </h1>
        <p className="text-muted-foreground">
          {t("selectBatchInvoices")}
        </p>
      </div>
      <BatchPaymentForm />
    </div>
    </PermissionGuard>
  );
}
