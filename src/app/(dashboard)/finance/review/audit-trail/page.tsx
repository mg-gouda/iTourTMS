"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type AuditRow = {
  id: string;
  userName: string;
  modelName: string;
  recordName: string | null;
  recordId: string;
  action: string;
  createdAt: string;
};

const ACTION_VARIANTS: Record<string, "default" | "outline" | "destructive" | "secondary"> = {
  created: "default",
  updated: "outline",
  deleted: "destructive",
  posted: "secondary",
  cancelled: "destructive",
};

const MODEL_LABELS: Record<string, string> = {
  Move: "Journal Entry",
  MoveLineItem: "Journal Item",
  Payment: "Payment",
  TaxReturn: "Tax Return",
  AccountAsset: "Fixed Asset",
  AccountLoan: "Loan",
};

const columns: ColumnDef<AuditRow, unknown>[] = [
  {
    id: "createdAt",
    accessorFn: (r) => r.createdAt,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date & Time" />,
    cell: ({ row }) => <span className="text-sm tabular-nums">{new Date(row.original.createdAt).toLocaleString()}</span>,
  },
  {
    accessorKey: "userName",
    header: "User",
    cell: ({ row }) => <span className="font-medium">{row.getValue("userName")}</span>,
  },
  {
    accessorKey: "modelName",
    header: "Document Type",
    cell: ({ row }) => <span>{MODEL_LABELS[row.getValue("modelName") as string] ?? row.getValue("modelName")}</span>,
  },
  {
    accessorKey: "recordName",
    header: "Record",
    cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("recordName") ?? row.original.recordId.slice(0, 8)}</span>,
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.getValue("action") as string;
      return <Badge variant={ACTION_VARIANTS[action] ?? "outline"} className="capitalize">{action}</Badge>;
    },
  },
];

export default function AuditTrailPage() {
  const { data, isLoading } = trpc.finance.auditTrail.list.useQuery({ pageSize: 100 });

  return (
    <PermissionGuard permission="finance:auditTrail:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground">Complete log of all accounting actions by user.</p>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.items as any) ?? []}
          searchKey="userName"
          searchPlaceholder="Search by user..."
        />
      )}
    </div>
    </PermissionGuard>
  );
}
