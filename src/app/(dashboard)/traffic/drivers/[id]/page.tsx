"use client";

import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TT_DRIVER_STATUS_LABELS, TT_DRIVER_STATUS_VARIANTS, TT_JOB_STATUS_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: driver, isLoading } = trpc.traffic.driver.getById.useQuery({ id });

  const deleteMutation = trpc.traffic.driver.delete.useMutation({
    onSuccess: () => { toast.success("Driver deleted"); router.push("/traffic/drivers"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="animate-fade-in space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[300px] w-full" /></div>;
  if (!driver) return <p>Driver not found.</p>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{driver.user.name ?? driver.user.email}</h1>
          <p className="text-muted-foreground">{driver.phone ?? "No phone"} &middot; License: {driver.licenseNumber ?? "—"}</p>
        </div>
        <Badge variant={(TT_DRIVER_STATUS_VARIANTS[driver.status] ?? "secondary") as never}>
          {TT_DRIVER_STATUS_LABELS[driver.status]}
        </Badge>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles ({driver.driverVehicles.length})</TabsTrigger>
          <TabsTrigger value="history">Recent Jobs ({driver.assignments.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Card><CardContent className="space-y-2 pt-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{driver.user.name ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{driver.user.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{driver.phone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">License</span><span className="font-medium">{driver.licenseNumber ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">License Expiry</span><span className="font-medium">{driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : "—"}</span></div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="vehicles">
          <Card><CardContent className="pt-6">
            {driver.driverVehicles.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No vehicles assigned.</p> : (
              <div className="space-y-2">{driver.driverVehicles.map((dv) => (
                <div key={dv.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{dv.vehicle.plateNumber} ({dv.vehicle.vehicleType.name})</span>
                  {dv.isPrimary && <Badge>Primary</Badge>}
                </div>
              ))}</div>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="history">
          <Card><CardContent className="pt-6">
            {driver.assignments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No recent assignments.</p> : (
              <div className="space-y-2">{driver.assignments.map((a) => (
                <div key={a.id} className="flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50" onClick={() => router.push(`/traffic/jobs/${a.job.id}`)}>
                  <span>{a.job.code} &middot; {new Date(a.job.serviceDate).toLocaleDateString()}</span>
                  <Badge variant="outline">{TT_JOB_STATUS_LABELS[a.job.status] ?? a.job.status}</Badge>
                </div>
              ))}</div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
        <Button variant="destructive" onClick={() => { if (confirm("Delete this driver?")) deleteMutation.mutate({ id }); }}>Delete</Button>
      </div>
    </div>
  );
}
