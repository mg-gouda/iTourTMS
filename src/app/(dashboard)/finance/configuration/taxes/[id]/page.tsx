"use client";

import { use } from "react";

import { TaxForm } from "@/components/finance/tax-form";
import { trpc } from "@/lib/trpc";

export default function EditTaxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.tax.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        Tax not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Tax</h1>
        <p className="text-muted-foreground">{data.name}</p>
      </div>
      <TaxForm
        defaultValues={{
          id: data.id,
          name: data.name,
          typeTaxUse: data.typeTaxUse as any,
          amountType: data.amountType as any,
          amount: Number(data.amount),
          priceInclude: data.priceInclude,
          includeBaseAmount: data.includeBaseAmount,
          taxGroupId: data.taxGroupId,
          taxScope: data.taxScope as any,
          isActive: data.isActive,
          sequence: data.sequence,
          repartitionLines: data.repartitionLines.map((l: any) => ({
            factorPercent: Number(l.factorPercent),
            accountId: l.accountId,
            useInTaxClosing: l.useInTaxClosing,
            documentType: l.documentType as any,
            sequence: l.sequence,
          })),
        }}
      />
    </div>
  );
}
