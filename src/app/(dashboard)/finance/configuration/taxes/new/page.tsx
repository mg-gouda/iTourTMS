"use client";

import { TaxForm } from "@/components/finance/tax-form";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewTaxPage() {
  return (
    <PermissionGuard permission="finance:tax:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Tax</h1>
        <p className="text-muted-foreground">
          Create a new tax rate with repartition rules.
        </p>
      </div>
      <TaxForm />
    </div>
    </PermissionGuard>
  );
}
