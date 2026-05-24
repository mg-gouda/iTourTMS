"use client";

import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MANIFEST_STATUS_LABELS, MANIFEST_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

export default function CruiseManifestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const [submissionRef, setSubmissionRef] = useState("");

  const { data, isLoading } = trpc.nileCruises.manifest.getById.useQuery({ id });

  const markSubmitted = trpc.nileCruises.manifest.markSubmitted.useMutation({
    onSuccess: () => { toast.success("Manifest marked as submitted"); utils.nileCruises.manifest.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const markAccepted = trpc.nileCruises.manifest.markAccepted.useMutation({
    onSuccess: () => { toast.success("Manifest accepted"); utils.nileCruises.manifest.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const markRejected = trpc.nileCruises.manifest.markRejected.useMutation({
    onSuccess: () => { toast.success("Manifest rejected"); utils.nileCruises.manifest.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Manifest not found</div>;

  const statusVariant = MANIFEST_STATUS_VARIANTS[data.status as keyof typeof MANIFEST_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline";

  const allPassengers = data.departure.bookings.flatMap((b) =>
    b.passengers.map((p) => ({ ...p, booking: b }))
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Manifest v{data.versionNumber}</h1>
            <Badge variant={statusVariant}>
              {MANIFEST_STATUS_LABELS[data.status as keyof typeof MANIFEST_STATUS_LABELS]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.departure.code} · {data.departure.boat.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(data.departure.embarkDate), "dd MMM yyyy")} – {format(new Date(data.departure.disembarkDate), "dd MMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          {data.status === "PENDING" && (
            <>
              <Input
                placeholder="Submission reference"
                value={submissionRef}
                onChange={(e) => setSubmissionRef(e.target.value)}
                className="w-48"
              />
              <Button
                onClick={() => markSubmitted.mutate({ id, submissionRef: submissionRef || undefined, method: "EMAIL" })}
                disabled={markSubmitted.isPending}
              >
                Mark Submitted
              </Button>
            </>
          )}
          {data.status === "SUBMITTED" && (
            <>
              <Button variant="default" onClick={() => markAccepted.mutate({ id })} disabled={markAccepted.isPending}>
                Mark Accepted
              </Button>
              <Button variant="destructive" onClick={() => markRejected.mutate({ id, reason: "Rejected by authority" })} disabled={markRejected.isPending}>
                Mark Rejected
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Pax", value: data.totalPax },
          { label: "Adults", value: data.totalAdults },
          { label: "Children", value: data.totalChildren },
          { label: "Infants", value: data.totalInfants },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Passenger list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Passenger List ({allPassengers.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left pb-2">#</th>
                  <th className="text-left pb-2">Name</th>
                  <th className="text-left pb-2">Nationality</th>
                  <th className="text-left pb-2">Passport</th>
                  <th className="text-left pb-2">DOB</th>
                  <th className="text-left pb-2">Cabin</th>
                  <th className="text-left pb-2">Booking</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allPassengers.map((p, idx) => {
                  const cabin = p.booking.cabinAssignments[0]?.cabin;
                  return (
                    <tr key={p.id}>
                      <td className="py-1.5 text-muted-foreground">{idx + 1}</td>
                      <td className="py-1.5 font-medium">
                        {p.title?.name ? `${p.title.name} ` : ""}{p.firstName} {p.lastName}
                      </td>
                      <td className="py-1.5">{p.nationality?.name ?? "—"}</td>
                      <td className="py-1.5 font-mono text-xs">{p.passportNumber ?? "—"}</td>
                      <td className="py-1.5 text-xs">{p.dateOfBirth ? format(new Date(p.dateOfBirth), "dd/MM/yyyy") : "—"}</td>
                      <td className="py-1.5">{cabin?.cabinNumber ?? "—"}</td>
                      <td className="py-1.5 font-mono text-xs">{p.booking.code}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Amendments */}
      {data.amendments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Amendment History</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.amendments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm">v{a.versionNumber}: {a.changeSummary}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(a.performedAt), "dd MMM yyyy HH:mm")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
