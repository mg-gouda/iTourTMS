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
import { MOVE_STATE_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type PaymentRow = {
  id: string;
  name: string | null;
  paymentType: string;
  state: string;
  amount: number;
  date: string;
  partner: { id: string; name: string } | null;
  journal: { code: string; name: string };
  currency: { code: string; symbol: string };
  move: { id: string; name: string | null } | null;
};

const columns: ColumnDef<PaymentRow, unknown>[] = [
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
    id: "partner",
    accessorFn: (row) => row.partner?.name ?? "—",
    header: "Partner",
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => new Date(row.getValue("date")).toLocaleDateString(),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">
        {Number(row.getValue("amount")).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.getValue("state") === "POSTED" ? "default" : "outline"}
      >
        {MOVE_STATE_LABELS[row.getValue("state") as string] ??
          row.getValue("state")}
      </Badge>
    ),
  },
  {
    id: "journal",
    accessorFn: (row) => `${row.journal.code}`,
    header: "Journal",
  },
  {
    id: "actions",
    cell: ({ row }) => <PaymentActions payment={row.original} />,
  },
];

function PaymentActions({ payment }: { payment: PaymentRow }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.payment.delete.useMutation({
    onSuccess: () => utils.finance.payment.list.invalidate(),
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
          <Link href={`/finance/payments/${payment.id}`}>View</Link>
        </DropdownMenuItem>
        {payment.state === "DRAFT" && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => deleteMutation.mutate({ id: payment.id })}
          >
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function PaymentsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.payment.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Manage customer and vendor payments.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/payments/new">
            <Plus className="mr-2 size-4" />
            New Payment
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
          searchPlaceholder="Search payments..."
          onRowClick={(row) => router.push(`/finance/payments/${row.id}`)}
        />
      )}
    </div>
  );
}
