"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

type AnalyticRow = {
  id: string;
  name: string | null;
  debit: string;
  credit: string;
  balance: string;
  move: { id: string; name: string | null; date: string; moveType: string };
  account: { code: string; name: string };
  analyticAccount: { code: string | null; name: string } | null;
  partner: { name: string } | null;
};

const columns: ColumnDef<AnalyticRow, unknown>[] = [
  {
    id: "date",
    accessorFn: (r) => r.move.date,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => new Date(row.original.move.date).toLocaleDateString(),
  },
  {
    id: "move",
    accessorFn: (r) => r.move.name ?? "Draft",
    header: "Entry",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.move.name ?? "Draft"}</span>,
  },
  {
    id: "analytic",
    accessorFn: (r) => r.analyticAccount?.name ?? "—",
    header: "Analytic Account",
    cell: ({ row }) => row.original.analyticAccount ? (
      <span>
        <Badge variant="outline" className="mr-1 font-mono text-xs">{row.original.analyticAccount.code ?? "—"}</Badge>
        {row.original.analyticAccount.name}
      </span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    id: "account",
    accessorFn: (r) => r.account.name,
    header: "Account",
    cell: ({ row }) => <span><span className="font-mono text-muted-foreground mr-1">{row.original.account.code}</span>{row.original.account.name}</span>,
  },
  { accessorKey: "name", header: "Label", cell: ({ row }) => row.getValue("name") ?? <span className="text-muted-foreground">—</span> },
  {
    id: "partner",
    accessorFn: (r) => r.partner?.name ?? "—",
    header: "Partner",
  },
  {
    accessorKey: "debit",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Debit" />,
    cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.getValue("debit")).toFixed(2)}</span>,
  },
  {
    accessorKey: "credit",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Credit" />,
    cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.getValue("credit")).toFixed(2)}</span>,
  },
  {
    accessorKey: "balance",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
    cell: ({ row }) => {
      const val = Number(row.getValue("balance"));
      return <span className={`font-mono tabular-nums ${val < 0 ? "text-destructive" : ""}`}>{val.toFixed(2)}</span>;
    },
  },
];

export default function AnalyticItemsPage() {
  const { data, isLoading } = trpc.finance.analytic.listItems.useQuery({});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytic Items</h1>
        <p className="text-muted-foreground">Journal lines assigned to an analytic account.</p>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.items as any) ?? []}
          searchKey="name"
          searchPlaceholder="Search items..."
        />
      )}
    </div>
  );
}
