"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
  RATE_BASIS_LABELS,
} from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";

type ContractRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  hotelId: string;
  validFrom: string | Date;
  validTo: string | Date;
  rateBasis: string;
  hotel: { id: string; name: string } | null;
  baseCurrency: { id: string; code: string; name: string } | null;
  _count: { seasons: number; roomTypes: number; mealBases: number };
};

const columns: ColumnDef<ContractRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.code}</span>
    ),
  },
  {
    id: "hotel",
    header: "Hotel",
    cell: ({ row }) => row.original.hotel?.name ?? "—",
  },
  {
    id: "period",
    header: "Period",
    cell: ({ row }) => {
      const from = format(new Date(row.original.validFrom), "dd MMM yyyy");
      const to = format(new Date(row.original.validTo), "dd MMM yyyy");
      return `${from} — ${to}`;
    },
  },
  {
    id: "currency",
    header: "Currency",
    cell: ({ row }) => row.original.baseCurrency?.code ?? "—",
  },
  {
    accessorKey: "rateBasis",
    header: "Rate Basis",
    cell: ({ row }) =>
      RATE_BASIS_LABELS[row.original.rateBasis] ?? row.original.rateBasis,
  },
  {
    id: "seasons",
    header: "Seasons",
    cell: ({ row }) => row.original._count.seasons,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          (CONTRACT_STATUS_VARIANTS[row.original.status] as
            | "default"
            | "secondary"
            | "outline"
            | "destructive") ?? "secondary"
        }
      >
        {CONTRACT_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
];

export default function ContractsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.contract.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground">
            Manage hotel contracts, seasons, and base rates
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/contracts/new">
            <Plus className="mr-2 size-4" /> New Contract
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as ContractRow[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search contracts..."
          onRowClick={(row) =>
            router.push(`/contracting/contracts/${row.id}`)
          }
        />
      )}
    </div>
  );
}
