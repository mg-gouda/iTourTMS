"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { trpc } from "@/lib/trpc";

/**
 * Adds a Branch column after the first one when the user is looking at more
 * than one branch. Inside a single branch it would say the same thing on
 * every row, so it stays out of the way.
 */
export function useBranchColumns<T>(columns: ColumnDef<T>[]): ColumnDef<T>[] {
  if (!useShowBranch()) return columns;

  const branch: ColumnDef<T> = {
    id: "branch",
    header: "Branch",
    accessorFn: (row) => (row as { branch?: { code: string } }).branch?.code ?? "—",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground font-mono text-xs">{getValue() as string}</span>
    ),
  };
  return [...columns.slice(0, 1), branch, ...columns.slice(1)];
}

/** True while the user looks at more than one branch, so rows need a branch label. */
export function useShowBranch(): boolean {
  const { data } = trpc.branch.mine.useQuery(undefined, { staleTime: 60_000 });
  return !!data && !data.activeId;
}
