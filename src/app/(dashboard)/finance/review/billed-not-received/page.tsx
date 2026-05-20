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
  invoiceDateDue: string | null;
  amountTotal: string;
  amountResidual: string;
  paymentState: string;
  journal: { code: string };
  partner: { name: string } | null;
};

const PAY_STATE_LABELS: Record<string, string> = { NOT_PAID: "Not Paid", PARTIAL: "Partially Paid" };

const columns: ColumnDef<BillRow, unknown>[] = [
  { id: "ref", accessorFn: (r) => r.name ?? "—", header: "Reference", cell: ({ row }) => <span className="font-mono">{row.original.name ?? "—"}</span> },
  { id: "date", accessorFn: (r) => r.date, header: ({ column }) => <DataTableColumnHeader column={column} title="Bill Date" />, cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { id: "due", accessorFn: (r) => r.invoiceDateDue, header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />, cell: ({ row }) => row.original.invoiceDateDue ? new Date(row.original.invoiceDateDue).toLocaleDateString() : "—" },
  { id: "partner", accessorFn: (r) => r.partner?.name ?? "—", header: "Vendor" },
  { id: "amount", accessorFn: (r) => r.amountTotal, header: ({ column }) => <DataTableColumnHeader column={column} title="Billed" />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.amountTotal).toFixed(2)}</span> },
  { id: "residual", accessorFn: (r) => r.amountResidual, header: ({ column }) => <DataTableColumnHeader column={column} title="Outstanding" />, cell: ({ row }) => <span className="font-mono tabular-nums font-semibold text-orange-600">{Number(row.original.amountResidual).toFixed(2)}</span> },
  { accessorKey: "paymentState", header: "Payment", cell: ({ row }) => <Badge variant="outline">{PAY_STATE_LABELS[row.getValue("paymentState") as string] ?? row.getValue("paymentState")}</Badge> },
  {
    id: "overdue",
    header: "Overdue",
    cell: ({ row }) => {
      const due = row.original.invoiceDateDue ? new Date(row.original.invoiceDateDue) : null;
      if (!due) return "—";
      const isOverdue = due < new Date();
      const days = Math.floor((new Date().getTime() - due.getTime()) / 86400000);
      return isOverdue ? <Badge variant="destructive">{days}d overdue</Badge> : <Badge variant="secondary">On time</Badge>;
    },
  },
  { id: "actions", cell: ({ row }) => <Button size="sm" variant="outline" asChild><Link href={`/finance/vendors/bills/${row.original.id}`}>Open</Link></Button> },
];

export default function BilledNotReceivedPage() {
  const { data, isLoading } = trpc.finance.review.billedNotReceived.useQuery({ page: 1, pageSize: 100 });

  return (
    <PermissionGuard permission="finance:auditTrail:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billed Not Received</h1>
          <p className="text-muted-foreground">Posted vendor bills with outstanding amounts awaiting payment.</p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1">{data?.total ?? 0} outstanding</Badge>
      </div>
      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(data?.items as any) ?? []} searchKey="name" searchPlaceholder="Search bills..." />
      )}
    </div>
    </PermissionGuard>
  );
}
