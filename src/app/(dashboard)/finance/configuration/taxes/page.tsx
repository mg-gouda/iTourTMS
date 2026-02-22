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
  TAX_AMOUNT_TYPE_LABELS,
  TAX_USE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type Tax = {
  id: string;
  name: string;
  typeTaxUse: string;
  amountType: string;
  amount: number | { toNumber?: () => number };
  isActive: boolean;
  taxGroup: { name: string } | null;
};

function displayAmount(tax: Tax): string {
  const amt =
    typeof tax.amount === "object" && tax.amount?.toNumber
      ? tax.amount.toNumber()
      : Number(tax.amount);
  if (tax.amountType === "PERCENT") return `${amt}%`;
  return String(amt);
}

const columns: ColumnDef<Tax, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "typeTaxUse",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tax Scope" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">
        {TAX_USE_LABELS[row.getValue("typeTaxUse") as string]}
      </Badge>
    ),
  },
  {
    accessorKey: "amountType",
    header: "Type",
    cell: ({ row }) =>
      TAX_AMOUNT_TYPE_LABELS[row.getValue("amountType") as string],
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => displayAmount(row.original),
  },
  {
    id: "group",
    accessorFn: (row) => row.taxGroup?.name ?? "—",
    header: "Group",
  },
  {
    accessorKey: "isActive",
    header: "Active",
    cell: ({ row }) =>
      row.getValue("isActive") ? (
        <Badge variant="default">Active</Badge>
      ) : (
        <Badge variant="secondary">Inactive</Badge>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => <TaxActions tax={row.original} />,
  },
];

function TaxActions({ tax }: { tax: Tax }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.tax.delete.useMutation({
    onSuccess: () => utils.finance.tax.list.invalidate(),
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
          <Link href={`/finance/configuration/taxes/${tax.id}`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => deleteMutation.mutate({ id: tax.id })}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TaxesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.tax.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Taxes</h1>
          <p className="text-muted-foreground">
            Configure tax rates and repartition rules.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/configuration/taxes/new">
            <Plus className="mr-2 size-4" />
            New Tax
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
          searchPlaceholder="Search taxes..."
          onRowClick={(row) =>
            router.push(`/finance/configuration/taxes/${row.id}`)
          }
        />
      )}
    </div>
  );
}
