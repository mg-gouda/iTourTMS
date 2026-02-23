"use client";

import { BatchPaymentForm } from "@/components/finance/batch-payment-form";

export default function NewBatchPaymentPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Batch Payment
        </h1>
        <p className="text-muted-foreground">
          Select invoices or bills to pay in batch.
        </p>
      </div>
      <BatchPaymentForm />
    </div>
  );
}
