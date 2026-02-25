"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type TORow = {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  active: boolean;
  country: { name: string } | null;
  market: { name: string } | null;
  _count: { contractAssignments: number; hotelAssignments: number };
};

const columns: ColumnDef<TORow>[] = [
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
    id: "country",
    header: "Country",
    cell: ({ row }) => row.original.country?.name ?? "—",
  },
  {
    id: "market",
    header: "Market",
    cell: ({ row }) => row.original.market?.name ?? "—",
  },
  {
    id: "contracts",
    header: "Contracts",
    cell: ({ row }) => row.original._count.contractAssignments,
  },
  {
    id: "hotels",
    header: "Hotels",
    cell: ({ row }) => row.original._count.hotelAssignments,
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

export default function TourOperatorsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.tourOperator.list.useQuery();

  const [activeFilter, setActiveFilter] = useState("ALL");

  const filteredData = useMemo(() => {
    let result = (data ?? []) as TORow[];
    if (activeFilter !== "ALL") {
      result = result.filter((t) =>
        activeFilter === "ACTIVE" ? t.active : !t.active,
      );
    }
    return result;
  }, [data, activeFilter]);

  const hasFilters = activeFilter !== "ALL";

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={activeFilter} onValueChange={setActiveFilter}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => setActiveFilter("ALL")}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Tour Operators</h1>
          <p className="text-muted-foreground">
            Manage tour operators and their contract/hotel assignments
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/tour-operators/new">
            <Plus className="mr-2 size-4" /> New Tour Operator
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
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchKey="name"
          searchPlaceholder="Search tour operators..."
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/contracting/tour-operators/${row.id}`)}
        />
      )}
    </div>
  );
}
