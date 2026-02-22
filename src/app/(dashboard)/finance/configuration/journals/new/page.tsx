"use client";

import { JournalForm } from "@/components/finance/journal-form";

export default function NewJournalPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Journal</h1>
        <p className="text-muted-foreground">
          Create a new accounting journal.
        </p>
      </div>
      <JournalForm />
    </div>
  );
}
