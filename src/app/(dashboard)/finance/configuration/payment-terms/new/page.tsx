"use client";

import { PaymentTermForm } from "@/components/finance/payment-term-form";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewPaymentTermPage() {
  return (
    <PermissionGuard permission="finance:paymentTerm:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Payment Term
        </h1>
        <p className="text-muted-foreground">
          Define a new payment schedule with installments.
        </p>
      </div>
      <PaymentTermForm />
    </div>
    </PermissionGuard>
  );
}
