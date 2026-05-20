"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TT_JOB_STATUS_LABELS,
  TT_JOB_STATUS_VARIANTS,
  TT_JOB_STATUS_TRANSITIONS,
  TT_SERVICE_TYPE_LABELS,
  TT_COST_TYPE_LABELS,
} from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function TrafficJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useTranslations("traffic");
  const tc = useTranslations("common");

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

  if (!job) return <p>{t("trafficJob")} not found.</p>;

  const allowedTransitions = TT_JOB_STATUS_TRANSITIONS[job.status] ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("trafficJob")} {job.code}</h1>
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
                  <SelectValue placeholder={t("changeStatus")} />
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
                {tc("save")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t("jobDetails")}</TabsTrigger>
          <TabsTrigger value="assignments">{t("assignResources")} ({job.assignments.length})</TabsTrigger>
          <TabsTrigger value="status-log">{tc("status")} Log ({job.statusLogs.length})</TabsTrigger>
          <TabsTrigger value="costs">{t("addOperationalCost")} ({job.operationalCosts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          {/* Excursion dispatch run stops */}
          {job.dispatchRun && (
            <Card>
              <CardHeader><CardTitle>{t("excursionPickupSequence")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("excursionPickupSequence").split(" ")[0]}</span>
                  <span className="font-medium">{job.dispatchRun.dispatch.excursion.name} ({job.dispatchRun.dispatch.excursion.code})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Run</span>
                  <span className="font-medium">#{job.dispatchRun.runNumber}</span>
                </div>
                {job.dispatchRun.rep && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("rep")}</span>
                    <span className="font-medium">{job.dispatchRun.rep.user.name}</span>
                  </div>
                )}
                {job.dispatchRun.dispatch.assemblyPointName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("assemblyPoint")}</span>
                    <span className="font-medium">{job.dispatchRun.dispatch.assemblyPointName}</span>
                  </div>
                )}
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("hotelPickupStops")}</p>
                  <div className="space-y-1">
                    {job.dispatchRun.stops.map((stop, idx) => (
                      <div key={stop.hotel.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{stop.hotel.name}</span>
                          <span className="text-muted-foreground text-xs">({stop.hotel.code})</span>
                        </div>
                        <span className="text-sm font-medium">{stop.paxCount} pax</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>{t("jobDetails")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label={t("serviceType")} value={TT_SERVICE_TYPE_LABELS[job.serviceType]} />
                <InfoRow label={tc("date")} value={new Date(job.serviceDate).toLocaleDateString()} />
                <InfoRow label={t("pickupTime")} value={job.pickupTime ?? "—"} />
                <InfoRow label={t("dropoffTime")} value={job.dropoffTime ?? "—"} />
                <InfoRow label={t("vehicleType")} value={job.vehicleType?.name ?? "—"} />
                <InfoRow label={t("zone")} value={job.zone?.name ?? "—"} />

                {/* Booking flight info */}
                {job.booking?.arrivalFlightNo ? (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">{t("arrivalFlight")}</span>
                    </div>
                    <InfoRow label={t("flightNo")} value={job.booking.arrivalFlightNo} />
                    <InfoRow label={t("arrivalTime")} value={job.booking.arrivalTime ?? "—"} />
                    <InfoRow label={t("route")} value={
                      job.booking.arrivalOriginApt && job.booking.arrivalDestApt
                        ? `${job.booking.arrivalOriginApt} → ${job.booking.arrivalDestApt}`
                        : job.booking.arrivalOriginApt ?? job.booking.arrivalDestApt ?? "—"
                    } />
                    <InfoRow label={t("terminal")} value={job.booking.arrivalTerminal ?? "—"} />
                  </>
                ) : null}

                {job.booking?.departFlightNo ? (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">{t("departureFlight")}</span>
                    </div>
                    <InfoRow label={t("flightNo")} value={job.booking.departFlightNo} />
                    <InfoRow label={t("departureTime")} value={job.booking.departTime ?? "—"} />
                    <InfoRow label={t("route")} value={
                      job.booking.departOriginApt && job.booking.departDestApt
                        ? `${job.booking.departOriginApt} → ${job.booking.departDestApt}`
                        : job.booking.departOriginApt ?? job.booking.departDestApt ?? "—"
                    } />
                    <InfoRow label={t("terminal")} value={job.booking.departTerminal ?? "—"} />
                  </>
                ) : null}

                {/* Fallback to standalone flight when no booking flights */}
                {!job.booking?.arrivalFlightNo && !job.booking?.departFlightNo && (
                  <InfoRow label={t("flights")} value={job.flight?.flightNumber ?? "—"} />
                )}

                <InfoRow label={t("bookingDetails")} value={job.booking?.code ?? "—"} />
                {job.booking && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("bookingLink")}</span>
                    <Link href={`/reservations/bookings/${job.booking.id}`} className="font-medium text-primary hover:underline">
                      {job.booking.code}
                    </Link>
                  </div>
                )}
                {job.booking?.hotel && (
                  <InfoRow label={t("bookingHotel")} value={job.booking.hotel.name} />
                )}
                <InfoRow label={t("partnerOverrides")} value={job.partner?.name ?? "—"} />
                <InfoRow label={t("createdBy")} value={job.createdBy?.name ?? "—"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t("passengerLocations")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label={t("passengers")} value={String(job.paxCount)} />
                <InfoRow label={t("leadPassenger")} value={job.leadPassenger ?? "—"} />
                <InfoRow label={tc("phone")} value={job.passengerPhone ?? "—"} />
                <InfoRow label={t("pickupAirport")} value={job.pickupAirport ? `${job.pickupAirport.code} - ${job.pickupAirport.name}` : "—"} />
                <InfoRow label={t("pickup")} value={job.pickupHotel?.name ?? "—"} />
                <InfoRow label={t("pickupAddress")} value={job.pickupAddress ?? "—"} />
                <InfoRow label={t("dropoffAirport")} value={job.dropoffAirport ? `${job.dropoffAirport.code} - ${job.dropoffAirport.name}` : "—"} />
                <InfoRow label={t("dropoff")} value={job.dropoffHotel?.name ?? "—"} />
                <InfoRow label={t("dropoffAddress")} value={job.dropoffAddress ?? "—"} />
                <InfoRow label={tc("amount")} value={job.currency ? `${job.currency.symbol}${Number(job.price).toFixed(2)}` : String(Number(job.price).toFixed(2))} />
                <InfoRow label={tc("total")} value={String(Number(job.cost).toFixed(2))} />
                {job.passengerNotes && !job.dispatchRun && (
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">{tc("notes")}</p>
                    <p className="whitespace-pre-wrap text-xs">{job.passengerNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardContent className="pt-6">
              {job.assignments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">{t("noAssignments")}</p>
              ) : (
                <div className="space-y-3">
                  {job.assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="space-y-1">
                        <p className="text-sm"><strong>{t("vehicle")}:</strong> {a.vehicle?.plateNumber ?? "—"}</p>
                        <p className="text-sm"><strong>{t("driver")}:</strong> {a.driver?.user.name ?? "—"}</p>
                        <p className="text-sm"><strong>{t("rep")}:</strong> {a.rep?.user.name ?? "—"}</p>
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
                <p className="text-center text-sm text-muted-foreground py-4">{t("noStatusChanges")}</p>
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
            <CardContent className="pt-6 space-y-4">
              {/* Add Cost Form */}
              <CostForm jobId={id} currencyId={job.currencyId ?? job.currency?.id ?? ""} />

              {/* Existing Costs */}
              {job.operationalCosts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">{t("noCosts")}</p>
              ) : (
                <div className="space-y-2">
                  {job.operationalCosts.map((c) => (
                    <CostRow key={c.id} cost={c} />
                  ))}
                  <div className="flex justify-end border-t pt-2 text-sm font-bold">
                    {tc("total")}: {job.operationalCosts.reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>{tc("back")}</Button>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm(tc("confirmDelete"))) deleteMutation.mutate({ id });
          }}
        >
          {tc("delete")}
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

function CostForm({ jobId, currencyId }: { jobId: string; currencyId: string }) {
  const utils = trpc.useUtils();
  const t = useTranslations("traffic");
  const tc = useTranslations("common");
  const [costType, setCostType] = useState("DRIVER_FEE");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.traffic.operationalCost.create.useMutation({
    onSuccess: () => {
      toast.success(tc("created"));
      utils.traffic.trafficJob.getById.invalidate({ id: jobId });
      setAmount("");
      setNotes("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-md border p-3 space-y-3">
      <p className="text-sm font-medium">{t("addOperationalCost")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">{tc("type")}</Label>
          <Select value={costType} onValueChange={setCostType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TT_COST_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{tc("amount")}</Label>
          <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-xs" placeholder="0.00" />
        </div>
        <div>
          <Label className="text-xs">{tc("notes")}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-xs" placeholder={tc("optional")} />
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            className="w-full"
            disabled={!amount || createMutation.isPending}
            onClick={() => {
              createMutation.mutate({
                jobId,
                costType,
                amount: Number(amount),
                currencyId,
                notes: notes || null,
              });
            }}
          >
            {createMutation.isPending ? tc("saving") : tc("add")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CostRow({ cost }: { cost: { id: string; costType: string; amount: unknown; notes: string | null; currency: { symbol: string } } }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.traffic.operationalCost.delete.useMutation({
    onSuccess: () => {
      toast.success("Cost deleted");
      utils.traffic.trafficJob.getById.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (

    <PermissionGuard permission="traffic:job:read">
      <div className="flex items-center justify-between rounded-md border p-3 text-sm">
      <div className="flex items-center gap-3">
        <Badge variant="outline">{TT_COST_TYPE_LABELS[cost.costType] ?? cost.costType}</Badge>
        {cost.notes && <span className="text-muted-foreground">{cost.notes}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{cost.currency.symbol}{Number(cost.amount).toFixed(2)}</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate({ id: cost.id })}>
          &times;
        </Button>
      </div>
    </div>
  

    </PermissionGuard>

  );
}
