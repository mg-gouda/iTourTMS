"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_BOOKING_STATUS_LABELS, TT_BOOKING_STATUS_VARIANTS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type GuestBooking = { id: string; code: string; status: string; serviceType: string; serviceDate: string | Date; guestName: string; guestPhone: string | null; paxCount: number; quotedPrice: any; paidAmount: any; vehicleType: { name: string } | null; currency: { symbol: string } | null };

export default function GuestBookingsPage() {
  const t = useTranslations("traffic");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.guestBooking.list.useQuery();

  const columns: ColumnDef<GuestBooking>[] = [
    { accessorKey: "code", header: tCommon("code"), cell: ({ row }) => <span className="font-mono">{row.original.code}</span> },
    { id: "status", header: tCommon("status"), accessorFn: (r) => r.status, cell: ({ row }) => <Badge variant={(TT_BOOKING_STATUS_VARIANTS[row.original.status] ?? "secondary") as never}>{TT_BOOKING_STATUS_LABELS[row.original.status]}</Badge> },
    { id: "service", header: t("serviceType"), accessorFn: (r) => TT_SERVICE_TYPE_LABELS[r.serviceType] ?? r.serviceType },
    { id: "date", header: tCommon("date"), accessorFn: (r) => new Date(r.serviceDate).toLocaleDateString() },
    { accessorKey: "guestName", header: t("guestName") },
    { id: "pax", header: t("passengers"), accessorFn: (r) => r.paxCount },
    { id: "price", header: t("quotedPrice"), accessorFn: (r) => `${r.currency?.symbol ?? ""}${Number(r.quotedPrice).toFixed(2)}` },
    { id: "paid", header: tCommon("paid"), accessorFn: (r) => `${r.currency?.symbol ?? ""}${Number(r.paidAmount).toFixed(2)}` },
  ];

  return (

    <PermissionGuard permission="traffic:guestBooking:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t("guestBookings")}</h1><p className="text-muted-foreground">{t("guestBookingsDesc")}</p></div>
        <Button asChild><Link href="/traffic/guest-bookings/new"><Plus className="mr-2 h-4 w-4" />{t("newGuestBooking")}</Link></Button>
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as GuestBooking[]} onRowClick={(row) => router.push(`/traffic/guest-bookings/${row.id}`)} />
      )}
    </div>
  

    </PermissionGuard>

  );
}
