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
import { trpc } from "@/lib/trpc";

type PaymentTerm = {
  id: string;
  name: string;
  earlyDiscount: boolean;
  discountPercent: unknown;
  discountDays: number | null;
  lines: { id: string }[];
};

const columns: ColumnDef<PaymentTerm, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    id: "installments",
    header: "Installments",
    cell: ({ row }) => row.original.lines.length,
  },
  {
    accessorKey: "earlyDiscount",
    header: "Early Discount",
    cell: ({ row }) =>
      row.original.earlyDiscount ? (
        <Badge variant="default">
          {String(row.original.discountPercent)}% / {row.original.discountDays} days
        </Badge>
      ) : (
        "—"
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => <PaymentTermActions term={row.original} />,
  },
];

function PaymentTermActions({ term }: { term: PaymentTerm }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.paymentTerm.delete.useMutation({
    onSuccess: () => utils.finance.paymentTerm.list.invalidate(),
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
          <Link href={`/finance/configuration/payment-terms/${term.id}`}>
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => deleteMutation.mutate({ id: term.id })}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function PaymentTermsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.paymentTerm.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Terms</h1>
          <p className="text-muted-foreground">
            Define payment schedules for invoices and bills.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/configuration/payment-terms/new">
            <Plus className="mr-2 size-4" />
            New Payment Term
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
          data={data ?? []}
          searchKey="name"
          searchPlaceholder="Search payment terms..."
          onRowClick={(row) =>
            router.push(`/finance/configuration/payment-terms/${row.id}`)
          }
        />
      )}
    </div>
  );
}
