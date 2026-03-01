"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TT_JOB_STATUS_LABELS,
  TT_JOB_STATUS_VARIANTS,
  TT_JOB_STATUS_TRANSITIONS,
  TT_SERVICE_TYPE_LABELS,
} from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function TrafficJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: job, isLoading } = trpc.traffic.trafficJob.getById.useQuery({ id });
  const [nextStatus, setNextStatus] = useState("");

  const updateStatusMutation = trpc.traffic.trafficJob.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.traffic.trafficJob.getById.invalidate({ id });
      setNextStatus("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.traffic.trafficJob.delete.useMutation({
    onSuccess: () => {
      toast.success("Job deleted");
      router.push("/traffic/jobs");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!job) return <p>Job not found.</p>;

  const allowedTransitions = TT_JOB_STATUS_TRANSITIONS[job.status] ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job {job.code}</h1>
          <p className="text-muted-foreground">
            {TT_SERVICE_TYPE_LABELS[job.serviceType]} &middot; {new Date(job.serviceDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={(TT_JOB_STATUS_VARIANTS[job.status] ?? "secondary") as never} className="text-sm">
            {TT_JOB_STATUS_LABELS[job.status]}
          </Badge>
          {allowedTransitions.length > 0 && (
            <div className="flex gap-2">
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  {allowedTransitions.map((s) => (
                    <SelectItem key={s} value={s}>{TT_JOB_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!nextStatus || updateStatusMutation.isPending}
                onClick={() => updateStatusMutation.mutate({ id, status: nextStatus as never })}
              >
                Update
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="assignments">Assignments ({job.assignments.length})</TabsTrigger>
          <TabsTrigger value="status-log">Status Log ({job.statusLogs.length})</TabsTrigger>
          <TabsTrigger value="costs">Costs ({job.operationalCosts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Service Type" value={TT_SERVICE_TYPE_LABELS[job.serviceType]} />
                <InfoRow label="Date" value={new Date(job.serviceDate).toLocaleDateString()} />
                <InfoRow label="Pickup Time" value={job.pickupTime ?? "—"} />
                <InfoRow label="Dropoff Time" value={job.dropoffTime ?? "—"} />
                <InfoRow label="Vehicle Type" value={job.vehicleType?.name ?? "—"} />
                <InfoRow label="Zone" value={job.zone?.name ?? "—"} />

                {/* Booking flight info */}
                {job.booking?.arrivalFlightNo ? (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Arrival Flight</span>
                    </div>
                    <InfoRow label="Flight No" value={job.booking.arrivalFlightNo} />
                    <InfoRow label="Time" value={job.booking.arrivalTime ?? "—"} />
                    <InfoRow label="Route" value={
                      job.booking.arrivalOriginApt && job.booking.arrivalDestApt
                        ? `${job.booking.arrivalOriginApt} → ${job.booking.arrivalDestApt}`
                        : job.booking.arrivalOriginApt ?? job.booking.arrivalDestApt ?? "—"
                    } />
                    <InfoRow label="Terminal" value={job.booking.arrivalTerminal ?? "—"} />
                  </>
                ) : null}

                {job.booking?.departFlightNo ? (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Departure Flight</span>
                    </div>
                    <InfoRow label="Flight No" value={job.booking.departFlightNo} />
                    <InfoRow label="Time" value={job.booking.departTime ?? "—"} />
                    <InfoRow label="Route" value={
                      job.booking.departOriginApt && job.booking.departDestApt
                        ? `${job.booking.departOriginApt} → ${job.booking.departDestApt}`
                        : job.booking.departOriginApt ?? job.booking.departDestApt ?? "—"
                    } />
                    <InfoRow label="Terminal" value={job.booking.departTerminal ?? "—"} />
                  </>
                ) : null}

                {/* Fallback to standalone flight when no booking flights */}
                {!job.booking?.arrivalFlightNo && !job.booking?.departFlightNo && (
                  <InfoRow label="Flight" value={job.flight?.flightNumber ?? "—"} />
                )}

                <InfoRow label="Booking" value={job.booking?.code ?? "—"} />
                {job.booking && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Link</span>
                    <Link href={`/reservations/bookings/${job.booking.id}`} className="font-medium text-primary hover:underline">
                      {job.booking.code}
                    </Link>
                  </div>
                )}
                {job.booking?.hotel && (
                  <InfoRow label="Booking Hotel" value={job.booking.hotel.name} />
                )}
                <InfoRow label="Partner" value={job.partner?.name ?? "—"} />
                <InfoRow label="Created By" value={job.createdBy?.name ?? "—"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Passenger & Locations</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Passengers" value={String(job.paxCount)} />
                <InfoRow label="Lead Passenger" value={job.leadPassenger ?? "—"} />
                <InfoRow label="Phone" value={job.passengerPhone ?? "—"} />
                <InfoRow label="Pickup Airport" value={job.pickupAirport ? `${job.pickupAirport.code} - ${job.pickupAirport.name}` : "—"} />
                <InfoRow label="Pickup Hotel" value={job.pickupHotel?.name ?? "—"} />
                <InfoRow label="Pickup Address" value={job.pickupAddress ?? "—"} />
                <InfoRow label="Dropoff Airport" value={job.dropoffAirport ? `${job.dropoffAirport.code} - ${job.dropoffAirport.name}` : "—"} />
                <InfoRow label="Dropoff Hotel" value={job.dropoffHotel?.name ?? "—"} />
                <InfoRow label="Dropoff Address" value={job.dropoffAddress ?? "—"} />
                <InfoRow label="Price" value={job.currency ? `${job.currency.symbol}${Number(job.price).toFixed(2)}` : String(Number(job.price).toFixed(2))} />
                <InfoRow label="Cost" value={String(Number(job.cost).toFixed(2))} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardContent className="pt-6">
              {job.assignments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No assignments yet.</p>
              ) : (
                <div className="space-y-3">
                  {job.assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="space-y-1">
                        <p className="text-sm"><strong>Vehicle:</strong> {a.vehicle?.plateNumber ?? "—"}</p>
                        <p className="text-sm"><strong>Driver:</strong> {a.driver?.user.name ?? "—"}</p>
                        <p className="text-sm"><strong>Rep:</strong> {a.rep?.user.name ?? "—"}</p>
                      </div>
                      <Badge variant="outline">{a.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status-log">
          <Card>
            <CardContent className="pt-6">
              {job.statusLogs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No status changes yet.</p>
              ) : (
                <div className="space-y-2">
                  {job.statusLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>
                        {TT_JOB_STATUS_LABELS[log.fromStatus] ?? log.fromStatus} → {TT_JOB_STATUS_LABELS[log.toStatus] ?? log.toStatus}
                      </span>
                      <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardContent className="pt-6">
              {job.operationalCosts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No costs recorded.</p>
              ) : (
                <div className="space-y-2">
                  {job.operationalCosts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{c.costType}</span>
                      <span>{c.currency.symbol}{Number(c.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm("Delete this job?")) deleteMutation.mutate({ id });
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
