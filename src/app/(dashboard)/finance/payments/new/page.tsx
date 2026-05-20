"use client";

import { useTranslations } from "next-intl";

import { PaymentForm } from "@/components/finance/payment-form";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewPaymentPage() {
  const t = useTranslations("finance");
  return (
    <PermissionGuard permission="finance:payment:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newPayment")}</h1>
        <p className="text-muted-foreground">
          {t("newPaymentDesc")}
        </p>
      </div>
      <PaymentForm />
    </div>
    </PermissionGuard>
  );
}
