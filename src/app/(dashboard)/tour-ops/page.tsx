"use client";

import {
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  FolderOpen,
  Plus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OPS_CLIENT_TYPE_LABELS,
  OPS_FILE_STATUS_LABELS,
  OPS_FILE_STATUS_VARIANTS,
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";

export default function TourOpsDashboardPage() {
  const { data, isLoading } = trpc.tourOps.file.dashboard.useQuery();

  const statusMap = Object.fromEntries(
    (data?.statusCounts ?? []).map((s) => [s.status, s._count._all])
  );

  const totalRevenue = Number(data?.revenueAgg._sum.totalSelling ?? 0);
  const totalCost = Number(data?.revenueAgg._sum.totalCost ?? 0);
  const totalMargin = Number(data?.revenueAgg._sum.margin ?? 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tour Operations</h1>
          <p className="text-sm text-muted-foreground">File management, packages & quotations</p>
        </div>
        <Button asChild>
          <Link href="/tour-ops/files/new">
            <Plus className="mr-2 h-4 w-4" /> New File
          </Link>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Open Files", value: (statusMap.DRAFT ?? 0) + (statusMap.QUOTED ?? 0), icon: FolderOpen, color: "text-blue-500" },
          { label: "Confirmed", value: (statusMap.CONFIRMED ?? 0) + (statusMap.IN_PROGRESS ?? 0), icon: CheckCircle, color: "text-green-500" },
          { label: "Confirmed Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-500" },
          { label: "Margin", value: totalCost > 0 ? `${((totalMargin / totalRevenue) * 100).toFixed(1)}%` : "—", icon: TrendingUp, color: "text-violet-500" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Files */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Files</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tour-ops/files">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !data?.recentFiles.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p className="text-sm">No files yet</p>
              <Button asChild size="sm">
                <Link href="/tour-ops/files/new">Create your first file</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {data.recentFiles.map((file) => {
                const clientName =
                  file.customer
                    ? `${file.customer.firstName} ${file.customer.lastName}`
                    : file.tourOperator?.name ?? file.guestName ?? "—";
                const latestQuotation = file.quotations[0];
                return (
                  <Link
                    key={file.id}
                    href={`/tour-ops/files/${file.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">{file.code}</p>
                        <p className="text-xs text-muted-foreground">{clientName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="hidden sm:block text-xs text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {format(new Date(file.travelFrom), "dd MMM yyyy")}
                      </div>
                      {latestQuotation && (
                        <span className="text-xs font-medium">
                          ${Number(latestQuotation.totalSelling).toLocaleString()}
                        </span>
                      )}
                      <Badge variant={OPS_FILE_STATUS_VARIANTS[file.status as keyof typeof OPS_FILE_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                        {OPS_FILE_STATUS_LABELS[file.status as keyof typeof OPS_FILE_STATUS_LABELS]}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {(["DRAFT", "QUOTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((status) => (
          <Link key={status} href={`/tour-ops/files?status=${status}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{OPS_FILE_STATUS_LABELS[status]}</span>
                  <Badge variant={OPS_FILE_STATUS_VARIANTS[status] as "default" | "secondary" | "destructive" | "outline"}>
                    {statusMap[status] ?? 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
