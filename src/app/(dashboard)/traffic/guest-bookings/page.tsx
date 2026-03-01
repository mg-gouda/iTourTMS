"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_BOOKING_STATUS_LABELS, TT_BOOKING_STATUS_VARIANTS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

type GuestBooking = { id: string; code: string; status: string; serviceType: string; serviceDate: string | Date; guestName: string; guestPhone: string | null; paxCount: number; quotedPrice: any; paidAmount: any; vehicleType: { name: string } | null; currency: { symbol: string } | null };

const columns: ColumnDef<GuestBooking>[] = [
  { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-mono">{row.original.code}</span> },
  { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ row }) => <Badge variant={(TT_BOOKING_STATUS_VARIANTS[row.original.status] ?? "secondary") as never}>{TT_BOOKING_STATUS_LABELS[row.original.status]}</Badge> },
  { id: "service", header: "Service", accessorFn: (r) => TT_SERVICE_TYPE_LABELS[r.serviceType] ?? r.serviceType },
  { id: "date", header: "Date", accessorFn: (r) => new Date(r.serviceDate).toLocaleDateString() },
  { accessorKey: "guestName", header: "Guest" },
  { id: "pax", header: "Pax", accessorFn: (r) => r.paxCount },
  { id: "price", header: "Price", accessorFn: (r) => `${r.currency?.symbol ?? ""}${Number(r.quotedPrice).toFixed(2)}` },
  { id: "paid", header: "Paid", accessorFn: (r) => `${r.currency?.symbol ?? ""}${Number(r.paidAmount).toFixed(2)}` },
];

export default function GuestBookingsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.guestBooking.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Guest Bookings</h1><p className="text-muted-foreground">B2C direct transport bookings</p></div>
        <Button asChild><Link href="/traffic/guest-bookings/new"><Plus className="mr-2 h-4 w-4" />New Booking</Link></Button>
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as GuestBooking[]} onRowClick={(row) => router.push(`/traffic/guest-bookings/${row.id}`)} />
      )}
    </div>
  );
}
