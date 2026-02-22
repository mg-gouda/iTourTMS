"use client";

import { use } from "react";

import { PaymentTermForm } from "@/components/finance/payment-term-form";
import { trpc } from "@/lib/trpc";

export default function EditPaymentTermPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.paymentTerm.getById.useQuery({
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
        Payment term not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Edit Payment Term
        </h1>
        <p className="text-muted-foreground">{data.name}</p>
      </div>
      <PaymentTermForm
        defaultValues={{
          id: data.id,
          name: data.name,
          note: data.note,
          earlyDiscount: data.earlyDiscount,
          discountPercent: data.discountPercent
            ? Number(data.discountPercent)
            : null,
          discountDays: data.discountDays,
          lines: data.lines.map((l: any) => ({
            valueType: l.valueType as any,
            valueAmount: Number(l.valueAmount),
            nbDays: l.nbDays,
            delayType: l.delayType as any,
            sequence: l.sequence,
          })),
        }}
      />
    </div>
  );
}
