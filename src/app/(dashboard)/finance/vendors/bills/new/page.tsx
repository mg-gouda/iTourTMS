"use client";

import { MoveForm } from "@/components/finance/move-form";

export default function NewVendorBillPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Vendor Bill</h1>
        <p className="text-muted-foreground">
          Create a new vendor bill.
        </p>
      </div>
      <MoveForm
        moveType="IN_INVOICE"
        returnPath="/finance/vendors/bills"
      />
    </div>
  );
}
