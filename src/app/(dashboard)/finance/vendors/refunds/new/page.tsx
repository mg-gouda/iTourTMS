"use client";

import { useTranslations } from "next-intl";

import { MoveForm } from "@/components/finance/move-form";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewVendorRefundPage() {
  const t = useTranslations("finance");
  return (
    <PermissionGuard permission="finance:partner:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newVendorRefund")}</h1>
        <p className="text-muted-foreground">
          {t("newVendorRefundDesc")}
        </p>
      </div>
      <MoveForm
        moveType="IN_REFUND"
        returnPath="/finance/vendors/refunds"
      />
    </div>
    </PermissionGuard>
  );
}
