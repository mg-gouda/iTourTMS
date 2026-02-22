"use client";

import { use } from "react";

import { PaymentForm } from "@/components/finance/payment-form";
import { trpc } from "@/lib/trpc";

export default function ViewPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.payment.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        Payment not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {data.name ?? "Draft Payment"}
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
  );
}
