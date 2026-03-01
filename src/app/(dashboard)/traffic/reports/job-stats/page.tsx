"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_JOB_STATUS_LABELS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function JobStatsPage() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);

  const { data, isLoading } = trpc.traffic.reports.jobStats.useQuery({ dateFrom: new Date(dateFrom), dateTo: new Date(dateTo) });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Job Statistics</h1></div>
        <div className="flex items-center gap-3">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
            <CardContent><div className="space-y-2">{data?.byStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{TT_JOB_STATUS_LABELS[s.status] ?? s.status}</span><Badge variant="outline">{s._count}</Badge>
              </div>
            ))}{data?.byStatus.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No data.</p>}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>By Service Type</CardTitle></CardHeader>
            <CardContent><div className="space-y-2">{data?.byServiceType.map((s) => (
              <div key={s.serviceType} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{TT_SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}</span><Badge variant="outline">{s._count}</Badge>
              </div>
            ))}{data?.byServiceType.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No data.</p>}</div></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
