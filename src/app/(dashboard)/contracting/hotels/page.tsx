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
import { STAR_RATING_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";

type HotelRow = {
  id: string;
  name: string;
  code: string;
  starRating: string;
  city: string;
  cityRel: { id: string; name: string; code: string } | null;
  active: boolean;
  country: { name: string } | null;
  destination: { name: string } | null;
  _count: { roomTypes: number };
};

const columns: ColumnDef<HotelRow>[] = [
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
    accessorKey: "starRating",
    header: "Stars",
    cell: ({ row }) =>
      STAR_RATING_LABELS[row.original.starRating] ?? row.original.starRating,
  },
  {
    id: "city",
    header: "City",
    cell: ({ row }) => row.original.cityRel?.name ?? row.original.city ?? "—",
  },
  {
    id: "country",
    header: "Country",
    cell: ({ row }) => row.original.country?.name ?? "—",
  },
  {
    id: "destination",
    header: "Destination",
    cell: ({ row }) => row.original.destination?.name ?? "—",
  },
  {
    id: "roomTypes",
    header: "Room Types",
    cell: ({ row }) => row.original._count.roomTypes,
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

export default function HotelsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.hotel.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hotels</h1>
          <p className="text-muted-foreground">
            Manage hotel master data, room types, and policies
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/hotels/new">
            <Plus className="mr-2 size-4" /> New Hotel
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
          data={(data as HotelRow[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search hotels..."
          onRowClick={(row) => router.push(`/contracting/hotels/${row.id}`)}
        />
      )}
    </div>
  );
}
