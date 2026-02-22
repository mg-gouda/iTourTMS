"use client";

import { MoveForm } from "@/components/finance/move-form";

export default function NewJournalEntryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Journal Entry</h1>
        <p className="text-muted-foreground">
          Create a manual journal entry.
        </p>
      </div>
      <MoveForm
        moveType="ENTRY"
        returnPath="/finance/accounting/journal-entries"
      />
    </div>
  );
}
