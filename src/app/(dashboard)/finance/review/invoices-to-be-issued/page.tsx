"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type InvRow = {
  id: string;
  name: string | null;
  date: string;
  amountTotal: string;
  journal: { code: string };
  partner: { name: string } | null;
};

const columns: ColumnDef<InvRow, unknown>[] = [
  { id: "date", accessorFn: (r) => r.date, header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />, cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { id: "ref", accessorFn: (r) => r.name ?? "Draft", header: "Reference", cell: ({ row }) => <span className="font-mono">{row.original.name ?? "Draft"}</span> },
  { id: "customer", accessorFn: (r) => r.partner?.name ?? "—", header: "Customer" },
  { id: "journal", accessorFn: (r) => r.journal.code, header: "Journal", cell: ({ row }) => <Badge variant="outline" className="font-mono">{row.original.journal.code}</Badge> },
  { id: "amount", accessorFn: (r) => r.amountTotal, header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />, cell: ({ row }) => <span className="font-mono tabular-nums font-semibold">{Number(row.original.amountTotal).toFixed(2)}</span> },
  { id: "status", header: "Status", cell: () => <Badge variant="outline">Draft</Badge> },
  { id: "actions", cell: ({ row }) => <Button size="sm" variant="outline" asChild><Link href={`/finance/customers/invoices/${row.original.id}`}>Open</Link></Button> },
];

export default function InvoicesToBeIssuedPage() {
  const { data, isLoading } = trpc.finance.review.invoicesToBeIssued.useQuery({ page: 1, pageSize: 100 });

  return (
    <PermissionGuard permission="finance:auditTrail:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices To Be Issued</h1>
          <p className="text-muted-foreground">Draft customer invoices awaiting confirmation and sending.</p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1">{data?.total ?? 0} pending</Badge>
      </div>
      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(data?.items as any) ?? []} searchKey="name" searchPlaceholder="Search invoices..." />
      )}
    </div>
    </PermissionGuard>
  );
}
