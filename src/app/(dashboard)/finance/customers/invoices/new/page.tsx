"use client";

import { MoveForm } from "@/components/finance/move-form";

export default function NewCustomerInvoicePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Customer Invoice</h1>
        <p className="text-muted-foreground">
          Create a new customer invoice.
        </p>
      </div>
      <MoveForm
        moveType="OUT_INVOICE"
        returnPath="/finance/customers/invoices"
      />
    </div>
  );
}
