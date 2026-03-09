"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const BOOKING_STATUS_VARIANTS: Record<string, string> = {
  PENDING: "outline",
  CONFIRMED: "default",
  CHECKED_IN: "default",
  CHECKED_OUT: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

const PAYMENT_STATUS_VARIANTS: Record<string, string> = {
  UNPAID: "outline",
  PARTIAL: "secondary",
  PAID: "default",
  REFUNDED: "destructive",
};

type ReservationRow = {
  id: string;
  code: string;
  hotel: { id: string; name: string } | null;
  tourOperator: { id: string; name: string; code: string } | null;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  adults: number;
  children: number;
  sellingTotal: unknown;
  currency: { id: string; code: string; symbol: string } | null;
  paymentStatus: string;
  status: string;
};

const columns: ColumnDef<ReservationRow>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  {
    id: "hotel",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hotel" />,
    cell: ({ row }) => <span className="font-medium">{row.original.hotel?.name ?? "—"}</span>,
  },
  {
    id: "tourOperator",
    header: "Tour Operator",
    cell: ({ row }) => row.original.tourOperator?.name ?? "—",
  },
  {
    accessorKey: "checkIn",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Check-in" />,
    cell: ({ row }) => new Date(row.original.checkIn).toLocaleDateString(),
  },
  {
    accessorKey: "checkOut",
    header: "Check-out",
    cell: ({ row }) => new Date(row.original.checkOut).toLocaleDateString(),
  },
  {
    accessorKey: "nights",
    header: "Nights",
  },
  {
    id: "guests",
    header: "Guests",
    cell: ({ row }) => {
      const { adults, children } = row.original;
      const parts = [`${adults}A`];
      if (children > 0) parts.push(`${children}C`);
      return parts.join(" + ");
    },
  },
  {
    id: "sellingTotal",
    header: "Selling Total",
    cell: ({ row }) => {
      const val = Number(row.original.sellingTotal ?? 0);
      return val > 0
        ? `${row.original.currency?.code ?? ""} ${val.toLocaleString()}`
        : "—";
    },
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => (
      <Badge variant={PAYMENT_STATUS_VARIANTS[row.original.paymentStatus] as "default"}>
        {PAYMENT_STATUS_LABELS[row.original.paymentStatus] ?? row.original.paymentStatus}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={BOOKING_STATUS_VARIANTS[row.original.status] as "default"}>
        {BOOKING_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
];

export default function ReservationsPage() {
  const router = useRouter();
  const { data: rawData, isLoading } = trpc.b2bPortal.reservation.list.useQuery({});
  const { data: operators } = trpc.b2bPortal.tourOperator.list.useQuery();

  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    let rows = (rawData?.items ?? []) as ReservationRow[];
    if (operatorFilter !== "all")
      rows = rows.filter((r) => r.tourOperator?.name === operatorFilter);
    if (statusFilter !== "all")
      rows = rows.filter((r) => r.status === statusFilter);
    if (dateFrom) {
      const from = new Date(dateFrom);
      rows = rows.filter((r) => new Date(r.checkIn) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      rows = rows.filter((r) => new Date(r.checkIn) <= to);
    }
    return rows;
  }, [rawData, operatorFilter, statusFilter, dateFrom, dateTo]);

  const filterToolbar = (
    <>
      <Select value={operatorFilter} onValueChange={setOperatorFilter}>
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="All Operators" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Operators</SelectItem>
          {(operators ?? []).map((op: { id: string; name: string }) => (
            <SelectItem key={op.id} value={op.name}>
              {op.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(BOOKING_STATUS_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
        <Input
          type="date"
          className="h-9 w-[140px]"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
        <Input
          type="date"
          className="h-9 w-[140px]"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
        <p className="text-muted-foreground">View and manage partner reservations</p>
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
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="code"
          searchPlaceholder="Search reservations..."
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/reservations/bookings/${row.id}`)}
        />
      )}
    </div>
  );
}
