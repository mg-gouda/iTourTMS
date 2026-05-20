"use client";

import { use } from "react";
import { useTranslations } from "next-intl";

import { AccountForm } from "@/components/finance/account-form";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.account.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        {t("accountNotFound")}
      </div>
    );
  }

  return (
    <PermissionGuard permission="finance:account:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("editAccount")}</h1>
        <p className="text-muted-foreground">
          {data.code} — {data.name}
        </p>
      </div>
      <AccountForm
        defaultValues={{
          id: data.id,
          code: data.code,
          name: data.name,
          accountType: data.accountType as any,
          reconcile: data.reconcile,
          deprecated: data.deprecated,
          groupId: data.groupId,
          currencyId: data.currencyId,
          tagIds: data.tags?.map((t: { id: string }) => t.id) ?? [],
        }}
      />
    </div>
    </PermissionGuard>
  );
}
