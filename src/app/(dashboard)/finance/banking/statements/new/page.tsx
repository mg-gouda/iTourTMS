"use client";

import { BankStatementForm } from "@/components/finance/bank-statement-form";

export default function NewBankStatementPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Bank Statement
        </h1>
        <p className="text-muted-foreground">
          Create a new bank or cash statement.
        </p>
      </div>
      <BankStatementForm />
    </div>
  );
}
