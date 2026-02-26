"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
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
import {
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { trpc } from "@/lib/trpc";

type BookingRow = {
  id: string;
  code: string;
  status: string;
  source: string;
  paymentStatus: string;
  checkIn: Date | string;
  checkOut: Date | string;
  nights: number;
  leadGuestName: string | null;
  sellingTotal: unknown;
  buyingTotal: unknown;
  hotel: { id: string; name: string; code: string };
  tourOperator: { id: string; name: string } | null;
  currency: { id: string; code: string; symbol: string };
  _count: { rooms: number; payments: number };
};

const columns: ColumnDef<BookingRow>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.code}</span>
    ),
  },
  {
    id: "hotel",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Hotel" />
    ),
    accessorFn: (row) => row.hotel.name,
    cell: ({ row }) => row.original.hotel.name,
  },
  {
    accessorKey: "leadGuestName",
    header: "Guest",
    cell: ({ row }) => row.original.leadGuestName ?? "—",
  },
  {
    accessorKey: "checkIn",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Check-in" />
    ),
    cell: ({ row }) => format(new Date(row.original.checkIn), "dd MMM yyyy"),
  },
  {
    accessorKey: "nights",
    header: "Nights",
    cell: ({ row }) => row.original.nights,
  },
  {
    id: "rooms",
    header: "Rooms",
    cell: ({ row }) => row.original._count.rooms,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          (BOOKING_STATUS_VARIANTS[row.original.status] as
            | "default"
            | "secondary"
            | "outline"
            | "destructive") ?? "secondary"
        }
      >
        {BOOKING_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => (
      <Badge
        variant={
          (PAYMENT_STATUS_VARIANTS[row.original.paymentStatus] as
            | "default"
            | "secondary"
            | "outline"
            | "destructive") ?? "secondary"
        }
      >
        {PAYMENT_STATUS_LABELS[row.original.paymentStatus] ?? row.original.paymentStatus}
      </Badge>
    ),
  },
  {
    id: "selling",
    header: () => <div className="text-right">Selling</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {row.original.currency.symbol}
        {Number(row.original.sellingTotal).toLocaleString("en", {
          minimumFractionDigits: 2,
        })}
      </div>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {BOOKING_SOURCE_LABELS[row.original.source] ?? row.original.source}
      </span>
    ),
  },
];

export default function BookingsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.reservations.booking.list.useQuery();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [hotelFilter, setHotelFilter] = useState("ALL");

  const hotels = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const b of data) map.set(b.hotel.id, b.hotel.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && b.source !== sourceFilter) return false;
      if (hotelFilter !== "ALL" && b.hotel.id !== hotelFilter) return false;
      return true;
    });
  }, [data, statusFilter, sourceFilter, hotelFilter]);

  const hasFilters =
    statusFilter !== "ALL" || sourceFilter !== "ALL" || hotelFilter !== "ALL";

  function clearFilters() {
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setHotelFilter("ALL");
  }

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.entries(BOOKING_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sourceFilter} onValueChange={setSourceFilter}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Sources</SelectItem>
          {Object.entries(BOOKING_SOURCE_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={hotelFilter} onValueChange={setHotelFilter}>
        <SelectTrigger className="h-8 w-[160px]">
          <SelectValue placeholder="Hotel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Hotels</SelectItem>
          {hotels.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.name}
            </SelectItem>
          ))}
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
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            Manage hotel reservations and booking lifecycle
          </p>
        </div>
        <Button asChild>
          <Link href="/reservations/bookings/new">
            <Plus className="mr-2 size-4" /> New Booking
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData as BookingRow[]}
          searchKey="code"
          searchPlaceholder="Search by code, guest, or ref..."
          toolbar={filterToolbar}
          onRowClick={(row) =>
            router.push(`/reservations/bookings/${row.id}`)
          }
        />
      )}
    </div>
  );
}
