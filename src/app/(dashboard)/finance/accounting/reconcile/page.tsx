"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type UnreconciledRow = {
  id: string;
  name: string | null;
  debit: string;
  credit: string;
  balance: string;
  dateMaturity: string | null;
  move: { name: string | null; date: string; journal: { code: string } };
  account: { code: string; name: string };
  partner: { name: string } | null;
};

export default function ReconcilePage() {
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = trpc.finance.review.journalItems.useQuery({ unreconciled: true, pageSize: 100 });

  const items = (data?.items as any) ?? [];

  const columns: ColumnDef<UnreconciledRow, unknown>[] = [
    { id: "date", accessorFn: (r) => r.move.date, header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />, cell: ({ row }) => new Date(row.original.move.date).toLocaleDateString() },
    { id: "entry", accessorFn: (r) => r.move.name ?? "Draft", header: "Entry", cell: ({ row }) => <span className="font-mono">{row.original.move.name ?? "Draft"}</span> },
    { id: "account", accessorFn: (r) => r.account.name, header: "Account", cell: ({ row }) => <span><span className="font-mono text-muted-foreground mr-1">{row.original.account.code}</span>{row.original.account.name}</span> },
    { id: "partner", accessorFn: (r) => r.partner?.name ?? "—", header: "Partner" },
    { accessorKey: "debit", header: ({ column }) => <DataTableColumnHeader column={column} title="Debit" />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.getValue("debit")).toFixed(2)}</span> },
    { accessorKey: "credit", header: ({ column }) => <DataTableColumnHeader column={column} title="Credit" />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.getValue("credit")).toFixed(2)}</span> },
    { id: "balance", accessorFn: (r) => r.balance, header: "Balance", cell: ({ row }) => { const v = Number(row.original.balance); return <span className={`font-mono tabular-nums ${v < 0 ? "text-destructive" : "text-green-600"}`}>{v.toFixed(2)}</span>; } },
    { id: "maturity", accessorFn: (r) => r.dateMaturity, header: "Maturity", cell: ({ row }) => row.original.dateMaturity ? new Date(row.original.dateMaturity).toLocaleDateString() : "—" },
    {
      id: "select",
      header: "Select",
      cell: ({ row }) => (
        <input type="checkbox" checked={selected.includes(row.original.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, row.original.id] : prev.filter((id) => id !== row.original.id))} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reconcile</h1>
          <p className="text-muted-foreground">Match outstanding receivable and payable lines.</p>
        </div>
        <Button variant="outline" onClick={() => setSelected([])}><RefreshCw className="mr-2 size-4" />Clear Selection</Button>
      </div>

      <div className="rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        Select 2+ lines with matching partner / account to reconcile them.&nbsp;
        <Badge variant="outline">{items.length} unreconciled lines</Badge>
      </div>

      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder="Search..." />
      )}
    </div>
  );
}
