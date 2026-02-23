"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { RATE_BASIS_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";

type TemplateRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  hotelId: string;
  validFrom: string | Date;
  validTo: string | Date;
  rateBasis: string;
  createdAt: string | Date;
  hotel: { id: string; name: string } | null;
  baseCurrency: { id: string; code: string; name: string } | null;
  _count: { seasons: number; roomTypes: number; mealBases: number };
};

const columns: ColumnDef<TemplateRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.name}</span>
        <Badge variant="secondary" className="ml-2 text-xs">
          Template
        </Badge>
      </div>
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
    id: "roomTypes",
    header: "Room Types",
    cell: ({ row }) => row.original._count.roomTypes,
  },
  {
    id: "created",
    header: "Created",
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd MMM yyyy"),
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.contract.listTemplates.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Contract Templates
          </h1>
          <p className="text-muted-foreground">
            Reusable contract configurations for quick contract creation
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as TemplateRow[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search templates..."
          onRowClick={(row) =>
            router.push(`/contracting/contracts/${row.id}`)
          }
        />
      )}
    </div>
  );
}
