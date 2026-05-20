"use client";

import { use } from "react";
import { useTranslations } from "next-intl";

import { FiscalPositionForm } from "@/components/finance/fiscal-position-form";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function EditFiscalPositionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.fiscalPosition.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        {t("fiscalPositionNotFound")}
      </div>
    );
  }

  return (
    <PermissionGuard permission="finance:settings:manage">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
        <p className="text-muted-foreground">{t("editFiscalPositionDesc")}</p>
      </div>
      <FiscalPositionForm
        defaultValues={{
          id: data.id,
          name: data.name,
          autoApply: data.autoApply,
          countryId: data.countryId,
          vatRequired: data.vatRequired,
          isActive: data.isActive,
          taxMaps: data.taxMaps.map((m: any) => ({
            taxSrcId: m.taxSrcId,
            taxDestId: m.taxDestId,
          })),
          accountMaps: data.accountMaps.map((m: any) => ({
            accountSrcId: m.accountSrcId,
            accountDestId: m.accountDestId,
          })),
        }}
      />
    </div>
    </PermissionGuard>
  );
}
