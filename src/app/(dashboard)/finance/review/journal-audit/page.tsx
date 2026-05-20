"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

const STATE_VARIANTS: Record<string, "default" | "outline" | "destructive"> = {
  POSTED: "default",
  DRAFT: "outline",
  CANCELLED: "destructive",
};

type AuditRow = {
  id: string;
  name: string | null;
  state: string;
  moveType: string;
  date: string;
  amountTotal: string;
  updatedAt: string;
  journal: { code: string; name: string };
  partner: { name: string } | null;
  _count: { lineItems: number };
};

const TYPE_LABELS: Record<string, string> = {
  ENTRY: "Journal Entry",
  OUT_INVOICE: "Customer Invoice",
  IN_INVOICE: "Vendor Bill",
  OUT_REFUND: "Credit Note",
  IN_REFUND: "Vendor Refund",
};

const columns: ColumnDef<AuditRow, unknown>[] = [
  {
    id: "updatedAt",
    accessorFn: (r) => r.updatedAt,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Modified" />,
    cell: ({ row }) => <span className="text-sm">{new Date(row.original.updatedAt).toLocaleString()}</span>,
  },
  {
    id: "entry",
    accessorFn: (r) => r.name ?? "Draft",
    header: "Entry",
    cell: ({ row }) => (
      <Link href={`/finance/accounting/journal-entries/${row.original.id}`} className="font-mono text-sm hover:underline">
        {row.original.name ?? "Draft"}
      </Link>
    ),
  },
  {
    accessorKey: "moveType",
    header: "Type",
    cell: ({ row }) => <span className="text-sm">{TYPE_LABELS[row.getValue("moveType") as string] ?? row.getValue("moveType")}</span>,
  },
  {
    id: "journal",
    accessorFn: (r) => r.journal.name,
    header: "Journal",
    cell: ({ row }) => <Badge variant="outline" className="font-mono">{row.original.journal.code}</Badge>,
  },
  { id: "date", accessorFn: (r) => r.date, header: ({ column }) => <DataTableColumnHeader column={column} title="Entry Date" />, cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { id: "partner", accessorFn: (r) => r.partner?.name ?? "—", header: "Partner" },
  { id: "lines", accessorFn: (r) => r._count.lineItems, header: "Lines", cell: ({ row }) => row.original._count.lineItems },
  {
    id: "total",
    accessorFn: (r) => r.amountTotal,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.amountTotal).toFixed(2)}</span>,
  },
  {
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => <Badge variant={STATE_VARIANTS[row.getValue("state") as string] ?? "outline"}>{row.getValue("state") as string}</Badge>,
  },
];

export default function JournalAuditPage() {
  const { data, isLoading } = trpc.finance.review.journalAudit.useQuery({ pageSize: 100 });

  return (
    <PermissionGuard permission="finance:auditTrail:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal Audit</h1>
        <p className="text-muted-foreground">All journal entries ordered by last modification date.</p>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">Loading...</div>
      ) : (
        <DataTable columns={columns} data={(data?.items as any) ?? []} searchKey="name" searchPlaceholder="Search entries..." />
      )}
    </div>
    </PermissionGuard>
  );
}
