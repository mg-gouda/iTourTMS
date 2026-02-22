"use client";

import { PaymentForm } from "@/components/finance/payment-form";

export default function NewPaymentPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Payment</h1>
        <p className="text-muted-foreground">
          Create a new customer or vendor payment.
        </p>
      </div>
      <PaymentForm />
    </div>
  );
}
