"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { X } from "lucide-react";
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

type StopSaleRow = {
  id: string;
  contractId: string;
  dateFrom: string | Date;
  dateTo: string | Date;
  reason: string | null;
  contract: {
    id: string;
    name: string;
    code: string;
    hotel: { id: string; name: string };
  };
  roomType: { id: string; name: string; code: string } | null;
};

const columns: ColumnDef<StopSaleRow>[] = [
  {
    accessorKey: "contract.hotel.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Hotel" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.contract.hotel.name}</span>
    ),
  },
  {
    accessorKey: "contract.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contract" />
    ),
    cell: ({ row }) => (
      <span>{row.original.contract.name}</span>
    ),
  },
  {
    id: "roomType",
    header: "Room Type",
    cell: ({ row }) =>
      row.original.roomType ? (
        <span>{row.original.roomType.name}</span>
      ) : (
        <Badge variant="destructive" className="text-xs">
          All Rooms
        </Badge>
      ),
  },
  {
    accessorKey: "dateFrom",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="From" />
    ),
    cell: ({ row }) => format(new Date(row.original.dateFrom), "dd MMM yyyy"),
  },
  {
    accessorKey: "dateTo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="To" />
    ),
    cell: ({ row }) => format(new Date(row.original.dateTo), "dd MMM yyyy"),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const now = new Date();
      const from = new Date(row.original.dateFrom);
      const to = new Date(row.original.dateTo);
      if (now < from) return <Badge variant="secondary">Upcoming</Badge>;
      if (now > to) return <Badge variant="outline">Expired</Badge>;
      return <Badge variant="destructive">Active</Badge>;
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <span className="text-muted-foreground truncate max-w-[200px] inline-block">
        {row.original.reason || "—"}
      </span>
    ),
  },
];

export default function StopSalesPage() {
  const [hotelId, setHotelId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data, isLoading } = trpc.contracting.contractAllotment.allStopSales.useQuery({
    hotelId: hotelId === "ALL" ? undefined : hotelId,
  });

  const filteredData = useMemo(() => {
    let result = (data ?? []) as StopSaleRow[];
    if (statusFilter !== "ALL") {
      const now = new Date();
      result = result.filter((ss) => {
        const from = new Date(ss.dateFrom);
        const to = new Date(ss.dateTo);
        if (statusFilter === "ACTIVE") return now >= from && now <= to;
        if (statusFilter === "UPCOMING") return now < from;
        if (statusFilter === "EXPIRED") return now > to;
        return true;
      });
    }
    return result;
  }, [data, statusFilter]);

  const hasFilters = hotelId !== "ALL" || statusFilter !== "ALL";

  const clearFilters = () => {
    setHotelId("ALL");
    setStatusFilter("ALL");
  };

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={hotelId} onValueChange={setHotelId}>
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder="Filter by hotel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Hotels</SelectItem>
          {hotels?.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="UPCOMING">Upcoming</SelectItem>
          <SelectItem value="EXPIRED">Expired</SelectItem>
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
          <h1 className="text-2xl font-bold tracking-tight">Stop Sales</h1>
          <p className="text-muted-foreground">
            Cross-contract stop sale overview
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchKey="contract.hotel.name"
          searchPlaceholder="Search by hotel..."
          toolbar={filterToolbar}
        />
      )}
    </div>
  );
}
