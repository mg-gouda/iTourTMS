"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type BillRow = {
  id: string;
  name: string | null;
  date: string;
  amountTotal: string;
  journal: { code: string };
  partner: { name: string } | null;
};

const columns: ColumnDef<BillRow, unknown>[] = [
  { id: "date", accessorFn: (r) => r.date, header: ({ column }) => <DataTableColumnHeader column={column} title="Bill Date" />, cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { id: "ref", accessorFn: (r) => r.name ?? "Draft", header: "Reference", cell: ({ row }) => <span className="font-mono">{row.original.name ?? "Draft"}</span> },
  { id: "partner", accessorFn: (r) => r.partner?.name ?? "—", header: "Vendor" },
  { id: "journal", accessorFn: (r) => r.journal.code, header: "Journal", cell: ({ row }) => <Badge variant="outline" className="font-mono">{row.original.journal.code}</Badge> },
  {
    id: "amount",
    accessorFn: (r) => r.amountTotal,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => <span className="font-mono tabular-nums font-semibold">{Number(row.original.amountTotal).toFixed(2)}</span>,
  },
  {
    id: "status",
    header: "Status",
    cell: () => <Badge variant="outline">Draft</Badge>,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button size="sm" variant="outline" asChild>
        <Link href={`/finance/vendors/bills/${row.original.id}`}>Open</Link>
      </Button>
    ),
  },
];

export default function BillToReceivePage() {
  const { data, isLoading } = trpc.finance.review.billToReceive.useQuery({ page: 1, pageSize: 100 });

  return (
    <PermissionGuard permission="finance:auditTrail:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills to Receive</h1>
          <p className="text-muted-foreground">Vendor bills in draft — awaiting receipt confirmation.</p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1">{data?.total ?? 0} pending</Badge>
      </div>
      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(data?.items as any) ?? []} searchKey="name" searchPlaceholder="Search bills..." />
      )}
    </div>
    </PermissionGuard>
  );
}
