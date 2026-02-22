"use client";

import { TaxForm } from "@/components/finance/tax-form";

export default function NewTaxPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Tax</h1>
        <p className="text-muted-foreground">
          Create a new tax rate with repartition rules.
        </p>
      </div>
      <TaxForm />
    </div>
  );
}
