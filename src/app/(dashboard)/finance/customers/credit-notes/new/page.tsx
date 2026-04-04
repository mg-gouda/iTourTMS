"use client";

import { MoveForm } from "@/components/finance/move-form";

export default function NewCreditNotePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Credit Note</h1>
        <p className="text-muted-foreground">
          Create a new customer credit note.
        </p>
      </div>
      <MoveForm
        moveType="OUT_REFUND"
        returnPath="/finance/customers/credit-notes"
      />
    </div>
  );
}
