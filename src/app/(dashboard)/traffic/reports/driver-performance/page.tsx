"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function DriverPerformancePage() {
  const now = new Date();
  const t = useTranslations("traffic");
  const tc = useTranslations("common");
  const [dateFrom, setDateFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);

  const { data, isLoading } = trpc.traffic.reports.driverPerformance.useQuery({ dateFrom: new Date(dateFrom), dateTo: new Date(dateTo) });

  return (

    <PermissionGuard permission="traffic:report:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t("driverPerformanceReport")}</h1></div>
        <div className="flex items-center gap-3">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
          <span className="text-muted-foreground">{tc("to")}</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.length}
            onClick={async () => {
              const { exportDriverReportToExcel } = await import("@/lib/export/traffic-driver-report-excel");
              await exportDriverReportToExcel(
                (data ?? []).map((d: Record<string, unknown>) => ({
                  name: (d.driverName as string) ?? "",
                  status: (d.status as string) ?? "",
                  licenseNumber: d.licenseNumber as string | null ?? null,
                  phone: d.phone as string | null ?? null,
                  totalJobs: (d.totalJobs as number) ?? 0,
                  completedJobs: (d.completedJobs as number) ?? 0,
                  cancelledJobs: (d.cancelledJobs as number) ?? 0,
                  noShowJobs: (d.noShowJobs as number) ?? 0,
                })),
                { from: dateFrom, to: dateTo },
              );
            }}
          >
            {tc("exportExcel")}
          </Button>
        </div>
      </div>
      {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
        <Card>
          <CardHeader><CardTitle>{t("performanceSummary")}</CardTitle></CardHeader>
          <CardContent>
            {data?.length === 0 ? <p className="py-8 text-center text-muted-foreground">{t("noDataForPeriod")}</p> : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 border-b pb-2 text-sm font-medium text-muted-foreground">
                  <span>{t("driver")}</span><span>{t("trafficJobs")}</span><span>{tc("completed")}</span><span>No Shows</span>
                </div>
                {data?.map((d) => (
                  <div key={d.id} className="grid grid-cols-4 gap-4 rounded-md border p-3 text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span>{d.total}</span>
                    <span className="text-green-600">{d.completed}</span>
                    <span className="text-red-600">{d.noShow}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  

    </PermissionGuard>

  );
}
