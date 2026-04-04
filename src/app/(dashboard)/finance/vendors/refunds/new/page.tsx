"use client";

import { MoveForm } from "@/components/finance/move-form";

export default function NewVendorRefundPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Vendor Refund</h1>
        <p className="text-muted-foreground">
          Create a new vendor refund.
        </p>
      </div>
      <MoveForm
        moveType="IN_REFUND"
        returnPath="/finance/vendors/refunds"
      />
    </div>
  );
}
