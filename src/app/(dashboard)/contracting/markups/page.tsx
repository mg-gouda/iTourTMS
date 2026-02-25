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

type MarkupRow = {
  id: string;
  name: string;
  markupType: string;
  value: { toString(): string };
  priority: number;
  active: boolean;
  contract: { name: string } | null;
  hotel: { name: string } | null;
  destination: { name: string } | null;
  market: { name: string } | null;
  tourOperator: { name: string } | null;
  _count: { tariffs: number };
  validFrom: Date | null;
  validTo: Date | null;
};

function scopeLabel(row: MarkupRow): string {
  if (row.contract) return `Contract: ${row.contract.name}`;
  if (row.hotel) return `Hotel: ${row.hotel.name}`;
  if (row.destination) return `Dest: ${row.destination.name}`;
  if (row.market) return `Market: ${row.market.name}`;
  if (row.tourOperator) return `TO: ${row.tourOperator.name}`;
  return "Global";
}

function typeLabel(t: string): string {
  switch (t) {
    case "PERCENTAGE":
      return "Percentage";
    case "FIXED_PER_NIGHT":
      return "Fixed/Night";
    case "FIXED_PER_BOOKING":
      return "Fixed/Booking";
    default:
      return t;
  }
}

const columns: ColumnDef<MarkupRow>[] = [
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
    accessorKey: "markupType",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline">{typeLabel(row.original.markupType)}</Badge>
    ),
  },
  {
    id: "value",
    header: "Value",
    cell: ({ row }) => {
      const val = parseFloat(row.original.value.toString());
      return row.original.markupType === "PERCENTAGE"
        ? `${val}%`
        : val.toFixed(2);
    },
  },
  {
    id: "scope",
    header: "Scope",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {scopeLabel(row.original)}
      </span>
    ),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
  },
  {
    id: "tariffs",
    header: "Tariffs",
    cell: ({ row }) => row.original._count.tariffs,
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

export default function MarkupRulesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.markupRule.list.useQuery();

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filteredData = useMemo(() => {
    let result = (data ?? []) as MarkupRow[];
    if (activeFilter !== "ALL") {
      result = result.filter((r) =>
        activeFilter === "ACTIVE" ? r.active : !r.active,
      );
    }
    if (typeFilter !== "ALL") {
      result = result.filter((r) => r.markupType === typeFilter);
    }
    return result;
  }, [data, activeFilter, typeFilter]);

  const hasFilters = activeFilter !== "ALL" || typeFilter !== "ALL";

  const clearFilters = () => {
    setActiveFilter("ALL");
    setTypeFilter("ALL");
  };

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

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Types</SelectItem>
          <SelectItem value="PERCENTAGE">Percentage</SelectItem>
          <SelectItem value="FIXED_PER_NIGHT">Fixed/Night</SelectItem>
          <SelectItem value="FIXED_PER_BOOKING">Fixed/Booking</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
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
          <h1 className="text-2xl font-bold tracking-tight">Markup Rules</h1>
          <p className="text-muted-foreground">
            Define markup rules for tariff generation (contract &gt; hotel &gt; destination &gt; global)
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/markups/new">
            <Plus className="mr-2 size-4" /> New Markup Rule
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
                <Skeleton className="h-4 w-32" />
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
          searchPlaceholder="Search markup rules..."
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/contracting/markups/${row.id}`)}
        />
      )}
    </div>
  );
}
