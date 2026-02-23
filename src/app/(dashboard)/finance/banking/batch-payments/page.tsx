"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BATCH_PAYMENT_STATE_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type BatchRow = {
  id: string;
  name: string | null;
  paymentType: string;
  state: string;
  totalAmount: number;
  date: string;
  journal: { id: string; code: string; name: string };
  _count: { payments: number };
};

const columns: ColumnDef<BatchRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Number" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.getValue("name") || "Draft"}
      </span>
    ),
  },
  {
    accessorKey: "paymentType",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline">
        {PAYMENT_TYPE_LABELS[row.getValue("paymentType") as string] ??
          row.getValue("paymentType")}
      </Badge>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => new Date(row.getValue("date")).toLocaleDateString(),
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">
        {Number(row.getValue("totalAmount")).toFixed(2)}
      </span>
    ),
  },
  {
    id: "payments",
    accessorFn: (row) => row._count.payments,
    header: "Payments",
  },
  {
    id: "journal",
    accessorFn: (row) => `${row.journal.code}`,
    header: "Journal",
  },
  {
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.getValue("state") === "POSTED" ? "default" : "outline"}
      >
        {BATCH_PAYMENT_STATE_LABELS[row.getValue("state") as string] ??
          row.getValue("state")}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <BatchActions batch={row.original} />,
  },
];

function BatchActions({ batch }: { batch: BatchRow }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.batchPayment.delete.useMutation({
    onSuccess: () => utils.finance.batchPayment.list.invalidate(),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/finance/banking/batch-payments/${batch.id}`}>View</Link>
        </DropdownMenuItem>
        {batch.state === "DRAFT" && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => deleteMutation.mutate({ id: batch.id })}
          >
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function BatchPaymentsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.batchPayment.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Batch Payments</h1>
          <p className="text-muted-foreground">
            Process multiple payments at once.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/banking/batch-payments/new">
            <Plus className="mr-2 size-4" />
            New Batch
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">
          Loading...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.items as any) ?? []}
          searchKey="name"
          searchPlaceholder="Search batch payments..."
          onRowClick={(row) =>
            router.push(`/finance/banking/batch-payments/${row.id}`)
          }
        />
      )}
    </div>
  );
}
