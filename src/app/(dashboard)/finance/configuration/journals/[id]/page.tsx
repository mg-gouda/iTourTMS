"use client";

import { use } from "react";

import { JournalForm } from "@/components/finance/journal-form";
import { trpc } from "@/lib/trpc";

export default function EditJournalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.journal.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        Journal not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Journal</h1>
        <p className="text-muted-foreground">
          {data.code} — {data.name}
        </p>
      </div>
      <JournalForm
        defaultValues={{
          id: data.id,
          code: data.code,
          name: data.name,
          type: data.type as any,
          defaultAccountId: data.defaultAccountId,
          suspenseAccountId: data.suspenseAccountId,
          profitAccountId: data.profitAccountId,
          lossAccountId: data.lossAccountId,
          currencyId: data.currencyId,
          sequencePrefix: data.sequencePrefix,
        }}
      />
    </div>
  );
}
