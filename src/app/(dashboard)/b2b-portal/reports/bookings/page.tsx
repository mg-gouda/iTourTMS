"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BarChart3, CalendarCheck, FileText, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

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
import { PermissionGuard } from "@/components/shared/permission-guard";

type SummaryRow = {
  tourOperatorId: string;
  tourOperatorName: string;
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  revenue: number;
  avgBookingValue: number;
};

export default function BookingReportsPage() {
  const { data: toList } = trpc.b2bPortal.tourOperator.list.useQuery();
  const t = useTranslations("b2bPortal");
  const tc = useTranslations("common");

  const columns: ColumnDef<SummaryRow>[] = [
    {
      accessorKey: "tourOperatorName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("tourOperator")} />,
      cell: ({ row }) => <span className="font-medium">{row.original.tourOperatorName}</span>,
    },
    {
      accessorKey: "totalBookings",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("totalBookings")} />,
    },
    {
      accessorKey: "confirmed",
      header: ({ column }) => <DataTableColumnHeader column={column} title={tc("confirmed")} />,
      cell: ({ row }) => <span className="text-green-600 font-medium">{row.original.confirmed}</span>,
    },
    {
      accessorKey: "cancelled",
      header: ({ column }) => <DataTableColumnHeader column={column} title={tc("cancelled")} />,
      cell: ({ row }) => <span className="text-red-600 font-medium">{row.original.cancelled}</span>,
    },
    {
      accessorKey: "revenue",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("revenue")} />,
      cell: ({ row }) => `$${row.original.revenue.toLocaleString()}`,
    },
    {
      accessorKey: "avgBookingValue",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("avgValue")} />,
      cell: ({ row }) => `$${row.original.avgBookingValue.toLocaleString()}`,
    },
  ];

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
    { title: t("totalBookings"), value: totals.totalBookings, icon: FileText, color: "text-blue-600" },
    { title: tc("confirmed"), value: totals.confirmed, icon: CalendarCheck, color: "text-green-600" },
    { title: tc("cancelled"), value: totals.cancelled, icon: XCircle, color: "text-red-500" },
    { title: t("totalRevenue"), value: `$${totals.revenue.toLocaleString()}`, icon: BarChart3, color: "text-emerald-600" },
  ];

  return (

    <PermissionGuard permission="b2b-portal:report:read">
      <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("bookingReports")}</h1>
        <p className="text-muted-foreground">{t("bookingReportsDesc")}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>{t("tourOperator")}</Label>
              <Select value={filters.tourOperatorId || "all"} onValueChange={(v) => setFilters({ ...filters, tourOperatorId: v === "all" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder={tc("all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allOperators")}</SelectItem>
                  {(toList ?? []).map((to: { id: string; name: string }) => (
                    <SelectItem key={to.id} value={to.id}>{to.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("dateFrom")}</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
            </div>
            <div>
              <Label>{t("dateTo")}</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
            </div>
            <div>
              <Label>{tc("status")}</Label>
              <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  <SelectItem value="CONFIRMED">{tc("confirmed")}</SelectItem>
                  <SelectItem value="CANCELLED">{tc("cancelled")}</SelectItem>
                  <SelectItem value="PENDING">{tc("pending")}</SelectItem>
                  <SelectItem value="COMPLETED">{tc("completed")}</SelectItem>
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
  

    </PermissionGuard>

  );
}
