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
import { MOVE_STATE_LABELS, PAYMENT_STATE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type MoveRow = {
  id: string;
  name: string | null;
  state: string;
  paymentState: string;
  date: string;
  amountTotal: number;
  amountResidual: number;
  partner: { id: string; name: string } | null;
  journal: { code: string; name: string };
  currency: { code: string; symbol: string };
};

const columns: ColumnDef<MoveRow, unknown>[] = [
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
    id: "partner",
    accessorFn: (row) => row.partner?.name ?? "—",
    header: "Customer",
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => new Date(row.getValue("date")).toLocaleDateString(),
  },
  {
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("state") === "POSTED" ? "default" : "outline"}>
        {MOVE_STATE_LABELS[row.getValue("state") as string] ?? row.getValue("state")}
      </Badge>
    ),
  },
  {
    accessorKey: "amountTotal",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">
        {Number(row.getValue("amountTotal")).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "paymentState",
    header: "Payment",
    cell: ({ row }) => (
      <Badge
        variant={
          row.getValue("paymentState") === "PAID" ? "default" : "outline"
        }
      >
        {PAYMENT_STATE_LABELS[row.getValue("paymentState") as string] ??
          row.getValue("paymentState")}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <InvoiceActions move={row.original} />,
  },
];

function InvoiceActions({ move }: { move: MoveRow }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.move.delete.useMutation({
    onSuccess: () => utils.finance.move.list.invalidate(),
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
          <Link href={`/finance/customers/invoices/${move.id}`}>Edit</Link>
        </DropdownMenuItem>
        {move.state === "DRAFT" && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => deleteMutation.mutate({ id: move.id })}
          >
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function CustomerInvoicesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.move.list.useQuery({
    moveType: "OUT_INVOICE",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Invoices</h1>
          <p className="text-muted-foreground">
            Manage customer invoices and track payments.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/customers/invoices/new">
            <Plus className="mr-2 size-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.items as any) ?? []}
          searchKey="name"
          searchPlaceholder="Search invoices..."
          onRowClick={(row) =>
            router.push(`/finance/customers/invoices/${row.id}`)
          }
        />
      )}
    </div>
  );
}
