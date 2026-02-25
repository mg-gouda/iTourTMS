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

type MarketRow = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  countryIds: string[];
  _count: { contracts: number };
};

const columns: ColumnDef<MarketRow>[] = [
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
    id: "countries",
    header: "Countries",
    cell: ({ row }) => row.original.countryIds.length || "—",
  },
  {
    id: "contracts",
    header: "Contracts",
    cell: ({ row }) => row.original._count.contracts,
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

export default function MarketsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.market.list.useQuery();

  const [activeFilter, setActiveFilter] = useState("ALL");

  const filteredData = useMemo(() => {
    let result = (data ?? []) as MarketRow[];
    if (activeFilter !== "ALL") {
      result = result.filter((m) =>
        activeFilter === "ACTIVE" ? m.active : !m.active,
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
          <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
          <p className="text-muted-foreground">
            Geographic market segments for contract availability
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/markets/new">
            <Plus className="mr-2 size-4" /> New Market
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
          searchPlaceholder="Search markets..."
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/contracting/markets/${row.id}`)}
        />
      )}
    </div>
  );
}
