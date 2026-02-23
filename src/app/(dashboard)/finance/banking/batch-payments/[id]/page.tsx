"use client";

import { use } from "react";

import { BatchPaymentForm } from "@/components/finance/batch-payment-form";
import { trpc } from "@/lib/trpc";

export default function ViewBatchPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.batchPayment.getById.useQuery({
    id,
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        Batch payment not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {data.name ?? "Draft Batch"}
        </h1>
        <p className="text-muted-foreground">
          {data.journal?.name ?? "Batch Payment"}
        </p>
      </div>
      <BatchPaymentForm
        defaultValues={{
          id: data.id,
          name: data.name,
          state: data.state,
          paymentType: data.paymentType,
          journalId: data.journalId,
          date: data.date,
          totalAmount: Number(data.totalAmount),
          paymentCount: data.paymentCount,
          journal: data.journal,
          payments: data.payments?.map((p: any) => ({
            id: p.id,
            name: p.name,
            state: p.state,
            amount: Number(p.amount),
            partner: p.partner,
            currency: p.currency,
            invoices: p.invoices?.map((inv: any) => ({
              id: inv.id,
              name: inv.name,
              amountTotal: Number(inv.amountTotal),
              paymentState: inv.paymentState,
            })),
          })),
        }}
      />
    </div>
  );
}
