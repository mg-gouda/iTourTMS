"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";

import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HOTEL_CREDIT_STATUS_LABELS,
  HOTEL_CREDIT_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { trpc } from "@/lib/trpc";

type HotelCreditRow = {
  id: string;
  code: string;
  hotelName: string;
  sourceBookingCode: string | null;
  sourceBookingId: string | null;
  amount: number;
  remainingAmount: number;
  currencySymbol: string;
  status: string;
  createdAt: Date;
};

export default function HotelCreditsPage() {
  const { data, isLoading } = trpc.reservations.hotelCredit.list.useQuery();

  const rows: HotelCreditRow[] = useMemo(
    () =>
      (data ?? []).map((c) => ({
        id: c.id,
        code: c.code,
        hotelName: c.hotel.name,
        sourceBookingCode: c.sourceBooking?.code ?? null,
        sourceBookingId: c.sourceBooking?.id ?? null,
        amount: Number(c.amount),
        remainingAmount: Number(c.remainingAmount),
        currencySymbol: c.currency.symbol,
        status: c.status,
        createdAt: new Date(c.createdAt),
      })),
    [data],
  );

  const columns = useMemo<ColumnDef<HotelCreditRow>[]>(
    () => [
      {
        id: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
        accessorFn: (row) => row.code,
        cell: ({ row }) => <span className="font-mono font-semibold">{row.original.code}</span>,
      },
      {
        id: "hotel",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hotel" />,
        accessorFn: (row) => row.hotelName,
        cell: ({ row }) => row.original.hotelName,
      },
      {
        id: "sourceBooking",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Source Booking" />,
        accessorFn: (row) => row.sourceBookingCode ?? "",
        cell: ({ row }) =>
          row.original.sourceBookingId ? (
            <Link
              href={`/reservations/bookings/${row.original.sourceBookingId}`}
              className="font-mono text-primary hover:underline"
            >
              {row.original.sourceBookingCode}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Original Amount" />,
        accessorFn: (row) => row.amount,
        cell: ({ row }) => (
          <span className="font-mono">
            {row.original.currencySymbol}{row.original.amount.toFixed(2)}
          </span>
        ),
      },
      {
        id: "remaining",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Remaining" />,
        accessorFn: (row) => row.remainingAmount,
        cell: ({ row }) => (
          <span className="font-mono font-semibold">
            {row.original.currencySymbol}{row.original.remainingAmount.toFixed(2)}
          </span>
        ),
      },
      {
        id: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        accessorFn: (row) => row.status,
        cell: ({ row }) => (
          <Badge
            variant={
              HOTEL_CREDIT_STATUS_VARIANTS[row.original.status] as
                | "default"
                | "secondary"
                | "destructive"
                | "outline"
                | "ghost"
                | "link"
                | "success"
                | "warning"
                | "info"
            }
          >
            {HOTEL_CREDIT_STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        accessorFn: (row) => row.createdAt,
        cell: ({ row }) => format(row.original.createdAt, "dd MMM yyyy"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/reservations/bookings/${row.original.sourceBookingId}`}>
              View Booking
            </Link>
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PermissionGuard permission="reservations:hotelCredit:read">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Hotel Credit Notes</h1>
          <p className="text-sm text-muted-foreground">
            Track money left with hotels after penalty-free cancellations.
          </p>
        </div>
        <DataTable columns={columns} data={rows} searchKey="code" searchPlaceholder="Search by code..." />
      </div>
    </PermissionGuard>
  );
}
