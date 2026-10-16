"use client";

import { trpc } from "@/lib/trpc";

/**
 * Combobox options from the whole chart of accounts, optionally limited to
 * account types starting with one of `types` ("EXPENSE" matches EXPENSE,
 * EXPENSE_DEPRECIATION, EXPENSE_DIRECT_COST). One cached query serves every
 * picker on the page.
 */
export function useAccountOptions(...types: string[]) {
  const { data } = trpc.finance.account.list.useQuery({ limit: 2000 });
  return (data?.items ?? [])
    .filter((a) => !types.length || types.some((t) => a.accountType.startsWith(t)))
    .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));
}
