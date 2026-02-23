"use client";

import { BankReconciliationView } from "@/components/finance/bank-reconciliation-view";

export default function ReconciliationPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bank Reconciliation
        </h1>
        <p className="text-muted-foreground">
          Match bank statement lines to journal entries.
        </p>
      </div>
      <BankReconciliationView />
    </div>
  );
}
