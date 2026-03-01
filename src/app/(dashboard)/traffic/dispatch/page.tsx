"use client";

import { useState } from "react";
import { CalendarDays, Lock, Unlock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TT_JOB_STATUS_LABELS, TT_JOB_STATUS_VARIANTS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function DispatchConsolePage() {
  const utils = trpc.useUtils();
  const today = new Date().toISOString().split("T")[0];
  const [dateStr, setDateStr] = useState(today);
  const date = new Date(dateStr);

  const { data, isLoading } = trpc.traffic.dispatch.getDailyDispatch.useQuery({ date });

  const lockMutation = trpc.traffic.dispatch.lockDispatch.useMutation({
    onSuccess: () => { utils.traffic.dispatch.invalidate(); toast.success("Dispatch locked"); },
    onError: (err) => toast.error(err.message),
  });

  const unlockMutation = trpc.traffic.dispatch.unlockDispatch.useMutation({
    onSuccess: () => { utils.traffic.dispatch.invalidate(); toast.success("Dispatch unlocked"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Dispatch Console</h1><p className="text-muted-foreground">Daily dispatch management</p></div>
        <div className="flex items-center gap-3">
          <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-[180px]" />
          <Button variant="outline" size="sm" onClick={() => lockMutation.mutate({ date })}><Lock className="mr-2 h-4 w-4" />Lock</Button>
          <Button variant="outline" size="sm" onClick={() => unlockMutation.mutate({ date })}><Unlock className="mr-2 h-4 w-4" />Unlock</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-4">
            <Badge variant="outline" className="text-sm">Total: {data?.total ?? 0}</Badge>
            <Badge variant="outline" className="text-sm">Arrivals: {data?.arrivals.length ?? 0}</Badge>
            <Badge variant="outline" className="text-sm">Departures: {data?.departures.length ?? 0}</Badge>
            <Badge variant="outline" className="text-sm">Others: {data?.others.length ?? 0}</Badge>
          </div>

          <DispatchSection title="Arrivals" jobs={data?.arrivals ?? []} />
          <DispatchSection title="Departures" jobs={data?.departures ?? []} />
          <DispatchSection title="Other Services" jobs={data?.others ?? []} />
        </div>
      )}
    </div>
  );
}

function DispatchSection({ title, jobs }: { title: string; jobs: any[] }) {
  if (jobs.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{title} ({jobs.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm">{job.code}</span>
                <span className="text-sm">{job.pickupTime ?? "—"}</span>
                <span className="text-sm">{TT_SERVICE_TYPE_LABELS[job.serviceType]}</span>
                <span className="text-sm text-muted-foreground">{job.leadPassenger ?? "—"} ({job.paxCount} pax)</span>
              </div>
              <div className="flex items-center gap-3">
                {job.assignments.length > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {job.assignments[0]?.vehicle?.plateNumber ?? "No vehicle"} / {job.assignments[0]?.driver?.user?.name ?? "No driver"}
                  </div>
                ) : (
                  <span className="text-sm text-amber-600">Unassigned</span>
                )}
                <Badge variant={(TT_JOB_STATUS_VARIANTS[job.status] ?? "secondary") as never}>
                  {TT_JOB_STATUS_LABELS[job.status]}
                </Badge>
                {job.dispatchLockedAt && <Lock className="h-3 w-3 text-muted-foreground" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
