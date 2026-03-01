"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_JOB_STATUS_LABELS, TT_JOB_STATUS_VARIANTS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function DailyDispatchReportPage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateStr, setDateStr] = useState(today);

  const { data, isLoading } = trpc.traffic.reports.dailyDispatch.useQuery({ date: new Date(dateStr) });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Daily Dispatch Report</h1></div>
        <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-[180px]" />
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : (
        <div className="space-y-2">
          {data?.map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="flex items-center gap-4">
                <span className="font-mono">{job.code}</span>
                <span>{job.pickupTime ?? "—"}</span>
                <span>{TT_SERVICE_TYPE_LABELS[job.serviceType]}</span>
                <span className="text-muted-foreground">{job.leadPassenger ?? "—"}</span>
                <span className="text-muted-foreground">{job.flight?.flightNumber ?? ""}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{job.assignments[0]?.vehicle?.plateNumber ?? "—"} / {job.assignments[0]?.driver?.user?.name ?? "—"}</span>
                <Badge variant={(TT_JOB_STATUS_VARIANTS[job.status] ?? "secondary") as never}>{TT_JOB_STATUS_LABELS[job.status]}</Badge>
              </div>
            </div>
          ))}
          {data?.length === 0 && <p className="py-8 text-center text-muted-foreground">No jobs for this date.</p>}
        </div>
      )}
    </div>
  );
}
