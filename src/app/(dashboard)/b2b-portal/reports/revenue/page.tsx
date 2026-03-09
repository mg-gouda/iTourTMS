"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, Receipt, TrendingUp, Wallet } from "lucide-react";
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

type RevenueRow = {
  tourOperatorId: string;
  tourOperatorName: string;
  sellingTotal: number;
  buyingTotal: number;
  markup: number;
  marginPct: number;
  bookingCount: number;
};

const columns: ColumnDef<RevenueRow>[] = [
  {
    accessorKey: "tourOperatorName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tour Operator" />,
    cell: ({ row }) => <span className="font-medium">{row.original.tourOperatorName}</span>,
  },
  {
    accessorKey: "sellingTotal",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Selling Total" />,
    cell: ({ row }) => `$${row.original.sellingTotal.toLocaleString()}`,
  },
  {
    accessorKey: "buyingTotal",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Buying Total" />,
    cell: ({ row }) => `$${row.original.buyingTotal.toLocaleString()}`,
  },
  {
    accessorKey: "markup",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Markup" />,
    cell: ({ row }) => (
      <span className="text-green-600 font-medium">
        ${row.original.markup.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "marginPct",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Margin %" />,
    cell: ({ row }) => (
      <span className={row.original.marginPct >= 0 ? "text-green-600" : "text-red-600"}>
        {row.original.marginPct.toFixed(1)}%
      </span>
    ),
  },
  {
    accessorKey: "bookingCount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Bookings" />,
  },
];

export default function RevenueReportsPage() {
  const { data: toList } = trpc.b2bPortal.tourOperator.list.useQuery();

  const [filters, setFilters] = useState({
    tourOperatorId: "",
    dateFrom: "",
    dateTo: "",
  });

  const { data, isLoading } = trpc.b2bPortal.reports.revenueSummary.useQuery({
    tourOperatorId: filters.tourOperatorId || undefined,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
  });

  const rows = data ?? [];
  const computedTotals = {
    sellingTotal: rows.reduce((sum, r) => sum + r.sellingTotal, 0),
    buyingTotal: rows.reduce((sum, r) => sum + r.buyingTotal, 0),
    markup: rows.reduce((sum, r) => sum + r.markup, 0),
  };
  const totals = {
    ...computedTotals,
    marginPct: computedTotals.sellingTotal > 0
      ? (computedTotals.markup / computedTotals.sellingTotal) * 100
      : 0,
  };

  const kpis = [
    { title: "Total Selling", value: `$${totals.sellingTotal.toLocaleString()}`, icon: Receipt, color: "text-blue-600" },
    { title: "Total Buying", value: `$${totals.buyingTotal.toLocaleString()}`, icon: Wallet, color: "text-red-500" },
    { title: "Markup Amount", value: `$${totals.markup.toLocaleString()}`, icon: DollarSign, color: "text-green-600" },
    { title: "Margin", value: `${totals.marginPct.toFixed(1)}%`, icon: TrendingUp, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue Reports</h1>
        <p className="text-muted-foreground">Revenue breakdown by partner and period</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
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
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(rows).map((r) => ({
            tourOperatorId: r.tourOperatorId ?? "",
            tourOperatorName: r.tourOperator?.name ?? "Unknown",
            sellingTotal: r.sellingTotal,
            buyingTotal: r.buyingTotal,
            markup: r.markup,
            marginPct: r.sellingTotal > 0 ? (r.markup / r.sellingTotal) * 100 : 0,
            bookingCount: r.bookingCount,
          })) as RevenueRow[]}
          searchKey="tourOperatorName"
          searchPlaceholder="Search tour operators..."
        />
      )}
    </div>
  );
}
