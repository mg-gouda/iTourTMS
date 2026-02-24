"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type DestRow = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  country: { id: string; name: string; code: string } | null;
  _count: { hotels: number; cities: number };
};

const columns: ColumnDef<DestRow>[] = [
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
    accessorKey: "country",
    header: "Country",
    cell: ({ row }) => row.original.country?.name ?? "—",
  },
  {
    id: "cities",
    header: "Cities",
    cell: ({ row }) => row.original._count.cities,
  },
  {
    id: "hotels",
    header: "Hotels",
    cell: ({ row }) => row.original._count.hotels,
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.active ? "default" : "secondary"}>
        {row.original.active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export default function DestinationsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.destination.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Destinations</h1>
          <p className="text-muted-foreground">
            City and region groupings for hotel locations
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/destinations/new">
            <Plus className="mr-2 size-4" /> New Destination
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
          data={(data as DestRow[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search destinations..."
          onRowClick={(row) =>
            router.push(`/contracting/destinations/${row.id}`)
          }
        />
      )}
    </div>
  );
}
