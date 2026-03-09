"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BarChart3, CalendarCheck, FileText, XCircle } from "lucide-react";
import { useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type SummaryRow = {
  tourOperatorId: string;
  tourOperatorName: string;
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  revenue: number;
  avgBookingValue: number;
};

const columns: ColumnDef<SummaryRow>[] = [
  {
    accessorKey: "tourOperatorName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tour Operator" />,
    cell: ({ row }) => <span className="font-medium">{row.original.tourOperatorName}</span>,
  },
  {
    accessorKey: "totalBookings",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Bookings" />,
  },
  {
    accessorKey: "confirmed",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Confirmed" />,
    cell: ({ row }) => <span className="text-green-600 font-medium">{row.original.confirmed}</span>,
  },
  {
    accessorKey: "cancelled",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cancelled" />,
    cell: ({ row }) => <span className="text-red-600 font-medium">{row.original.cancelled}</span>,
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Revenue" />,
    cell: ({ row }) => `$${row.original.revenue.toLocaleString()}`,
  },
  {
    accessorKey: "avgBookingValue",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Avg. Value" />,
    cell: ({ row }) => `$${row.original.avgBookingValue.toLocaleString()}`,
  },
];

export default function BookingReportsPage() {
  const { data: toList } = trpc.b2bPortal.tourOperator.list.useQuery();

  const [filters, setFilters] = useState({
    tourOperatorId: "",
    dateFrom: "",
    dateTo: "",
    status: "",
  });

  const { data, isLoading } = trpc.b2bPortal.reports.bookingSummary.useQuery({
    tourOperatorId: filters.tourOperatorId || undefined,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
  });

  const totals = {
    totalBookings: data?.totalBookings ?? 0,
    confirmed: data?.byStatus?.find((s) => s.status === "CONFIRMED")?.count ?? 0,
    cancelled: data?.byStatus?.find((s) => s.status === "CANCELLED")?.count ?? 0,
    revenue: data?.byStatus?.reduce((sum, s) => sum + s.sellingTotal, 0) ?? 0,
  };

  const kpis = [
    { title: "Total Bookings", value: totals.totalBookings, icon: FileText, color: "text-blue-600" },
    { title: "Confirmed", value: totals.confirmed, icon: CalendarCheck, color: "text-green-600" },
    { title: "Cancelled", value: totals.cancelled, icon: XCircle, color: "text-red-500" },
    { title: "Total Revenue", value: `$${totals.revenue.toLocaleString()}`, icon: BarChart3, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Reports</h1>
        <p className="text-muted-foreground">Booking volume and status analytics by partner</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Tour Operator</Label>
              <Select value={filters.tourOperatorId || "all"} onValueChange={(v) => setFilters({ ...filters, tourOperatorId: v === "all" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tour Operators</SelectItem>
                  {(toList ?? []).map((to: { id: string; name: string }) => (
                    <SelectItem key={to.id} value={to.id}>{to.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date From</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
            </div>
            <div>
              <Label>Date To</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Breakdown Table */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.byStatus ?? []).map((s) => ({
            tourOperatorId: "",
            tourOperatorName: s.status,
            totalBookings: s.count,
            confirmed: s.status === "CONFIRMED" ? s.count : 0,
            cancelled: s.status === "CANCELLED" ? s.count : 0,
            revenue: s.sellingTotal,
            avgBookingValue: s.count > 0 ? s.sellingTotal / s.count : 0,
          })) as SummaryRow[]}
          searchKey="tourOperatorName"
          searchPlaceholder="Search tour operators..."
        />
      )}
    </div>
  );
}
