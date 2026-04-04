"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TT_DRIVER_STATUS_LABELS, TT_DRIVER_STATUS_VARIANTS, TT_JOB_STATUS_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: driver, isLoading } = trpc.traffic.driver.getById.useQuery({ id });

  const deleteMutation = trpc.traffic.driver.delete.useMutation({
    onSuccess: () => { toast.success("Driver deleted"); router.push("/traffic/drivers"); },
    onError: (err) => toast.error(err.message),
  });

  const unassignMutation = trpc.traffic.driver.unassignVehicle.useMutation({
    onSuccess: () => {
      toast.success("Vehicle unassigned");
      utils.traffic.driver.getById.invalidate({ id });
    },
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assigned Vehicles</CardTitle>
              <AssignVehicleDialog driverId={id} onSuccess={() => utils.traffic.driver.getById.invalidate({ id })} />
            </CardHeader>
            <CardContent>
              {driver.driverVehicles.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No vehicles assigned.</p> : (
                <div className="space-y-2">{driver.driverVehicles.map((dv) => (
                  <div key={dv.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>{dv.vehicle.plateNumber} ({dv.vehicle.vehicleType.name})</span>
                    <div className="flex items-center gap-3">
                      {dv.isPrimary && <Badge>Primary</Badge>}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Unassign this vehicle?")) {
                            unassignMutation.mutate({ driverId: id, vehicleId: dv.vehicle.id });
                          }
                        }}
                      >
                        Unassign
                      </Button>
                    </div>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
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

function AssignVehicleDialog({ driverId, onSuccess }: { driverId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const { data: vehicles } = trpc.traffic.vehicle.list.useQuery(undefined, { enabled: open });

  const assignMutation = trpc.traffic.driver.assignVehicle.useMutation({
    onSuccess: () => {
      toast.success("Vehicle assigned");
      setOpen(false);
      setVehicleId("");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) { toast.error("Select a vehicle"); return; }
    assignMutation.mutate({ driverId, vehicleId });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Assign Vehicle</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
              <SelectContent>
                {vehicles?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plateNumber} ({v.vehicleType.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
