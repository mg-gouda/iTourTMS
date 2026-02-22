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

type FiscalPositionRow = {
  id: string;
  name: string;
  autoApply: boolean;
  vatRequired: boolean;
  isActive: boolean;
  country: { id: string; name: string } | null;
  _count: { taxMaps: number; accountMaps: number };
};

const columns: ColumnDef<FiscalPositionRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    id: "country",
    accessorFn: (row) => row.country?.name ?? "—",
    header: "Country",
  },
  {
    accessorKey: "autoApply",
    header: "Auto Apply",
    cell: ({ row }) => (
      <Badge variant={row.getValue("autoApply") ? "default" : "outline"}>
        {row.getValue("autoApply") ? "Yes" : "No"}
      </Badge>
    ),
  },
  {
    accessorKey: "vatRequired",
    header: "VAT Required",
    cell: ({ row }) => (row.getValue("vatRequired") ? "Yes" : "No"),
  },
  {
    id: "mappings",
    header: "Mappings",
    cell: ({ row }) => {
      const c = row.original._count;
      return `${c.taxMaps} tax, ${c.accountMaps} account`;
    },
  },
  {
    accessorKey: "isActive",
    header: "Active",
    cell: ({ row }) => (
      <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>
        {row.getValue("isActive") ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <FPActions fp={row.original} />,
  },
];

function FPActions({ fp }: { fp: FiscalPositionRow }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.fiscalPosition.delete.useMutation({
    onSuccess: () => utils.finance.fiscalPosition.list.invalidate(),
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
          <Link href={`/finance/configuration/fiscal-positions/${fp.id}`}>
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => deleteMutation.mutate({ id: fp.id })}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function FiscalPositionsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.fiscalPosition.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Fiscal Positions
          </h1>
          <p className="text-muted-foreground">
            Configure tax and account mappings per jurisdiction.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/configuration/fiscal-positions/new">
            <Plus className="mr-2 size-4" />
            New Fiscal Position
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
          data={(data as any) ?? []}
          searchKey="name"
          searchPlaceholder="Search fiscal positions..."
          onRowClick={(row) =>
            router.push(`/finance/configuration/fiscal-positions/${row.id}`)
          }
        />
      )}
    </div>
  );
}
