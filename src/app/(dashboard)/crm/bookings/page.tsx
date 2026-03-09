"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarDays, FileSpreadsheet, List, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BookingCalendar } from "@/components/crm/booking-calendar";
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
  CRM_BOOKING_STATUS_LABELS,
  CRM_BOOKING_STATUS_VARIANTS,
} from "@/lib/constants/crm";
import { exportBookingsListToExcel } from "@/lib/export/bookings-list-excel";
import { trpc } from "@/lib/trpc";

type BookingRow = {
  id: string;
  code: string;
  status: string;
  travelDate: Date;
  paxAdults: number;
  paxChildren: number;
  paxInfants: number;
  totalSelling: unknown;
  currency: string;
  customer: { id: string; firstName: string; lastName: string } | null;
  bookedBy: { id: string; name: string | null } | null;
  _count: { items: number };
  createdAt: Date;
};

const columns: ColumnDef<BookingRow>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  {
    id: "customer",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    accessorFn: (row) => row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : "",
    cell: ({ row }) => row.original.customer
      ? <span className="font-medium">{row.original.customer.firstName} {row.original.customer.lastName}</span>
      : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "travelDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Travel Date" />,
    cell: ({ row }) => new Date(row.original.travelDate).toLocaleDateString(),
  },
  {
    id: "pax",
    header: "Pax",
    cell: ({ row }) => {
      const { paxAdults, paxChildren, paxInfants } = row.original;
      const parts = [`${paxAdults}A`];
      if (paxChildren > 0) parts.push(`${paxChildren}C`);
      if (paxInfants > 0) parts.push(`${paxInfants}I`);
      return parts.join(" + ");
    },
  },
  {
    id: "items",
    header: "Items",
    cell: ({ row }) => row.original._count.items,
  },
  {
    id: "total",
    header: "Total",
    cell: ({ row }) => {
      const val = Number(row.original.totalSelling ?? 0);
      return val > 0 ? `$${val.toLocaleString()}` : "—";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={CRM_BOOKING_STATUS_VARIANTS[row.original.status] as "default"}>
        {CRM_BOOKING_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
];

export default function BookingsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.crm.booking.list.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "calendar">("list");

  const filtered = useMemo(() => {
    let rows = (data ?? []) as BookingRow[];
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [data, statusFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">Manage excursion bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() => exportBookingsListToExcel(filtered)}
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button asChild>
            <Link href="/crm/bookings/new">
              <Plus className="mr-2 size-4" /> New Booking
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : view === "calendar" ? (
        <BookingCalendar bookings={filtered} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="customer"
          searchPlaceholder="Search bookings..."
          toolbar={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(CRM_BOOKING_STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          onRowClick={(row) => router.push(`/crm/bookings/${row.id}`)}
        />
      )}
    </div>
  );
}
