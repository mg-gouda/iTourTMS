"use client";

import { use } from "react";

import { AccountForm } from "@/components/finance/account-form";
import { trpc } from "@/lib/trpc";

export default function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.account.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        Account not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Account</h1>
        <p className="text-muted-foreground">
          {data.code} — {data.name}
        </p>
      </div>
      <AccountForm
        defaultValues={{
          id: data.id,
          code: data.code,
          name: data.name,
          accountType: data.accountType as any,
          reconcile: data.reconcile,
          deprecated: data.deprecated,
          groupId: data.groupId,
          currencyId: data.currencyId,
          tagIds: data.tags?.map((t: { id: string }) => t.id) ?? [],
        }}
      />
    </div>
  );
}
