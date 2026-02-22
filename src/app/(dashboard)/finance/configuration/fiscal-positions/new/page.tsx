"use client";

import { FiscalPositionForm } from "@/components/finance/fiscal-position-form";

export default function NewFiscalPositionPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Fiscal Position
        </h1>
        <p className="text-muted-foreground">
          Create a fiscal position with tax and account mappings.
        </p>
      </div>
      <FiscalPositionForm />
    </div>
  );
}
