"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { trpc } from "@/lib/trpc";

/**
 * Adds a Branch column after the first one when the user is looking at more
 * than one branch. Inside a single branch it would say the same thing on
 * every row, so it stays out of the way.
 */
export function useBranchColumns<T>(columns: ColumnDef<T>[]): ColumnDef<T>[] {
  const { data } = trpc.branch.mine.useQuery(undefined, { staleTime: 60_000 });
  if (!data || data.activeId) return columns;

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
