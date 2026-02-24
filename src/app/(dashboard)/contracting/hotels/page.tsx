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
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
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
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
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
