"use client";

import { useState } from "react";
import { CalendarDays, Lock, Unlock, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          <Button
            variant="outline"
            size="sm"
            disabled={!data}
            onClick={async () => {
              const { generateDispatchPdf } = await import("@/lib/export/traffic-dispatch-pdf");
              const allJobs = [...(data?.arrivals ?? []), ...(data?.departures ?? []), ...(data?.others ?? [])];
              const pdf = generateDispatchPdf({
                date,
                jobs: allJobs.map((j: Record<string, unknown>) => ({
                  code: j.code as string,
                  serviceType: j.serviceType as string,
                  status: j.status as string,
                  serviceDate: j.serviceDate as string,
                  serviceTime: j.serviceTime as string | null,
                  pickupLocation: j.pickupLocation as string | null,
                  dropoffLocation: j.dropoffLocation as string | null,
                  guestName: j.guestName as string | null,
                  flightNo: j.flightNo as string | null,
                  pax: (j.pax as number) ?? 0,
                  vehicleName: (j.vehicleType as { name: string } | null)?.name ?? null,
                  driverName: (j.driver as { name: string } | null)?.name ?? null,
                  repName: (j.rep as { name: string } | null)?.name ?? null,
                })),
              });
              pdf.save(`dispatch-${dateStr}.pdf`);
            }}
          >
            Export PDF
          </Button>
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

          <DispatchSection title="Arrivals" jobs={data?.arrivals ?? []} date={date} />
          <DispatchSection title="Departures" jobs={data?.departures ?? []} date={date} />
          <DispatchSection title="Other Services" jobs={data?.others ?? []} date={date} />
        </div>
      )}
    </div>
  );
}

function DispatchSection({ title, jobs, date }: { title: string; jobs: any[]; date: Date }) {
  const utils = trpc.useUtils();
  const [assignJobId, setAssignJobId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [repId, setRepId] = useState("");

  const { data: vehicles } = trpc.traffic.dispatch.getAvailableVehicles.useQuery({ date }, { enabled: !!assignJobId });
  const { data: drivers } = trpc.traffic.dispatch.getAvailableDrivers.useQuery({ date }, { enabled: !!assignJobId });
  const { data: reps } = trpc.traffic.dispatch.getAvailableReps.useQuery({ date }, { enabled: !!assignJobId });

  const assignMutation = trpc.traffic.dispatch.bulkAssign.useMutation({
    onSuccess: () => {
      toast.success("Job assigned");
      utils.traffic.dispatch.getDailyDispatch.invalidate({ date });
      setAssignJobId(null);
      setVehicleId("");
      setDriverId("");
      setRepId("");
    },
    onError: (e) => toast.error(e.message),
  });

  if (jobs.length === 0) return null;
  return (
    <>
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
                    <Button variant="outline" size="sm" onClick={() => setAssignJobId(job.id)}>
                      <UserPlus className="mr-1 h-3 w-3" /> Assign
                    </Button>
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

      <Dialog open={!!assignJobId} onOpenChange={(open) => { if (!open) setAssignJobId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Resources</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                <SelectContent>
                  {(vehicles ?? []).map((v: { id: string; plateNumber: string; vehicleType?: { name: string } }) => (
                    <SelectItem key={v.id} value={v.id}>{v.plateNumber} {v.vehicleType?.name ? `(${v.vehicleType.name})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger><SelectValue placeholder="Select driver..." /></SelectTrigger>
                <SelectContent>
                  {(drivers ?? []).map((d: { id: string; user?: { name: string }; name?: string }) => (
                    <SelectItem key={d.id} value={d.id}>{d.user?.name ?? d.name ?? d.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rep (optional)</Label>
              <Select value={repId || "__none"} onValueChange={(v) => setRepId(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No rep" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No rep</SelectItem>
                  {(reps ?? []).map((r: { id: string; name: string }) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!vehicleId || !driverId || assignMutation.isPending}
              onClick={() => {
                if (!assignJobId) return;
                assignMutation.mutate({
                  assignments: [{
                    jobId: assignJobId,
                    vehicleId,
                    driverId,
                    repId: repId || undefined,
                  }],
                });
              }}
            >
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
