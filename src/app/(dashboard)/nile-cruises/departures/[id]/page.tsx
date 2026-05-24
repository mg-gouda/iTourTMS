"use client";

import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRUISE_DEPARTURE_STATUS_LABELS, CRUISE_DEPARTURE_STATUS_VARIANTS, CRUISE_BOOKING_STATUS_LABELS, CRUISE_BOOKING_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Plus } from "lucide-react";

const STATUS_PROGRESSION: Record<string, string> = {
  SCHEDULED: "OPEN_FOR_SALE",
  OPEN_FOR_SALE: "CLOSED_FOR_SALE",
  CLOSED_FOR_SALE: "EMBARKING",
  EMBARKING: "SAILING",
  SAILING: "DISEMBARKED",
};

export default function CruiseDepartureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.nileCruises.departure.getById.useQuery({ id });
  const { data: allotments } = trpc.nileCruises.allotment.listByDeparture.useQuery({ departureId: id });
  const { data: assignments } = trpc.nileCruises.cabinAssignment.listByDeparture.useQuery({ departureId: id });
  const { data: manifest } = trpc.nileCruises.manifest.listByDeparture.useQuery({ departureId: id });
  const { data: bookings } = trpc.nileCruises.booking.list.useQuery({ departureId: id });

  const transitionStatus = trpc.nileCruises.departure.transitionStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); utils.nileCruises.departure.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const generateManifest = trpc.nileCruises.manifest.generate.useMutation({
    onSuccess: () => { toast.success("Manifest generated"); utils.nileCruises.manifest.listByDeparture.invalidate({ departureId: id }); },
    onError: (err) => toast.error(err.message),
  });

  const autoAssign = trpc.nileCruises.cabinAssignment.autoAssign.useMutation({
    onSuccess: () => { toast.success("Cabins auto-assigned"); utils.nileCruises.cabinAssignment.listByDeparture.invalidate({ departureId: id }); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Departure not found</div>;

  const statusVariant = CRUISE_DEPARTURE_STATUS_VARIANTS[data.status as keyof typeof CRUISE_DEPARTURE_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline";
  const nextStatus = STATUS_PROGRESSION[data.status] ?? null;

  const confirmedCount = (bookings ?? []).filter((b) => ["CONFIRMED", "EMBARKED"].includes(b.status)).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{data.code}</h1>
            <Badge variant={statusVariant}>
              {CRUISE_DEPARTURE_STATUS_LABELS[data.status as keyof typeof CRUISE_DEPARTURE_STATUS_LABELS]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.boat.name} · {data.cruiseType.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(data.embarkDate), "dd MMM yyyy")} → {format(new Date(data.disembarkDate), "dd MMM yyyy")}
            {data.embarkPort && ` · ${data.embarkPort}`}
            {data.disembarkPort && ` → ${data.disembarkPort}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link href={`/nile-cruises/bookings/new?departureId=${id}`}>
              <Plus className="mr-2 h-4 w-4" /> New Booking
            </Link>
          </Button>
          <Button variant="outline" onClick={() => generateManifest.mutate({ departureId: id })} disabled={generateManifest.isPending}>
            Generate Manifest
          </Button>
          {nextStatus && (
            <Button onClick={() => transitionStatus.mutate({ id, status: nextStatus as never })} disabled={transitionStatus.isPending}>
              → {CRUISE_DEPARTURE_STATUS_LABELS[nextStatus as keyof typeof CRUISE_DEPARTURE_STATUS_LABELS]}
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Bookings", value: data._count.bookings },
          { label: "Confirmed", value: confirmedCount },
          { label: "Cabin Assignments", value: assignments?.length ?? 0 },
          { label: "Allotments", value: allotments?.length ?? 0 },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Bookings ({data._count.bookings})</TabsTrigger>
          <TabsTrigger value="allotments">Allotments</TabsTrigger>
          <TabsTrigger value="cabins">Cabin Chart</TabsTrigger>
          <TabsTrigger value="manifests">Manifests ({manifest?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {!bookings?.length ? (
                <p className="text-sm text-muted-foreground py-4">No bookings yet</p>
              ) : (
                <div className="divide-y">
                  {bookings.map((b) => (
                    <Link key={b.id} href={`/nile-cruises/bookings/${b.id}`} className="flex items-center justify-between py-2.5 hover:bg-muted/50 px-1 rounded transition-colors">
                      <div>
                        <p className="text-sm font-medium">{b.code}</p>
                        <p className="text-xs text-muted-foreground">{b.leadGuestName} · {b.adults}A {b.children > 0 ? `${b.children}C` : ""}</p>
                      </div>
                      <Badge variant={CRUISE_BOOKING_STATUS_VARIANTS[b.status as keyof typeof CRUISE_BOOKING_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                        {CRUISE_BOOKING_STATUS_LABELS[b.status as keyof typeof CRUISE_BOOKING_STATUS_LABELS]}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allotments">
          <Card>
            <CardHeader><CardTitle className="text-base">Allotments</CardTitle></CardHeader>
            <CardContent>
              {!allotments?.length ? (
                <p className="text-sm text-muted-foreground py-4">No allotments configured</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left pb-2">Category</th>
                        <th className="text-right pb-2">Total</th>
                        <th className="text-right pb-2">Sold</th>
                        <th className="text-right pb-2">Available</th>
                        <th className="text-left pb-2">Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allotments.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2">{a.cabinCategory.name}</td>
                          <td className="py-2 text-right">{a.totalCabins}</td>
                          <td className="py-2 text-right">{a.soldCabins}</td>
                          <td className="py-2 text-right font-medium">{a.totalCabins - a.soldCabins}</td>
                          <td className="py-2 text-xs">{a.allocationBasis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cabins">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Cabin Assignments</CardTitle>
              <Button size="sm" variant="outline" onClick={() => autoAssign.mutate({ departureId: id })} disabled={autoAssign.isPending}>
                Auto-Assign
              </Button>
            </CardHeader>
            <CardContent>
              {!assignments?.length ? (
                <p className="text-sm text-muted-foreground py-4">No cabin assignments</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {assignments.map((a) => (
                    <div key={a.id} className="rounded border px-3 py-2 text-sm">
                      <p className="font-medium">{a.cabin.cabinNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.booking.leadGuestName}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manifests">
          <Card>
            <CardHeader><CardTitle className="text-base">Manifests</CardTitle></CardHeader>
            <CardContent>
              {!manifest?.length ? (
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-3">No manifests generated</p>
                  <Button onClick={() => generateManifest.mutate({ departureId: id })} disabled={generateManifest.isPending}>
                    Generate Manifest
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {manifest.map((m) => (
                    <Link key={m.id} href={`/nile-cruises/manifests/${m.id}`} className="flex items-center justify-between py-2.5 hover:bg-muted/50 px-1 rounded transition-colors">
                      <div>
                        <p className="text-sm font-medium">Version {m.versionNumber}</p>
                        <p className="text-xs text-muted-foreground">{m.totalPax} pax</p>
                      </div>
                      <Badge variant="outline">{m.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
