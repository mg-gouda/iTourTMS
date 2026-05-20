"use client";

import { use } from "react";
import { useTranslations } from "next-intl";

import { PaymentForm } from "@/components/finance/payment-form";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ViewPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const { data, isLoading } = trpc.finance.payment.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        {t("paymentNotFound")}
      </div>
    );
  }

  return (
    <PermissionGuard permission="finance:payment:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {data.name ?? t("draftPayment")}
        </h1>
        <p className="text-muted-foreground">
          {data.ref ?? data.journal?.name ?? "Payment"}
        </p>
      </div>
      <PaymentForm
        defaultValues={{
          id: data.id,
          state: data.state,
          name: data.name,
          paymentType: data.paymentType as any,
          partnerId: data.partnerId,
          amount: Number(data.amount),
          currencyId: data.currencyId,
          date: new Date(data.date),
          journalId: data.journalId,
          ref: data.ref,
          invoiceMoveIds: data.invoices?.map((i: any) => i.id) ?? [],
        }}
      />
    </div>
    </PermissionGuard>
  );
}
