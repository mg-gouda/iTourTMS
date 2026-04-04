"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TT_VEHICLE_STATUS_LABELS, TT_VEHICLE_STATUS_VARIANTS, TT_VEHICLE_OWNERSHIP_LABELS, TT_COMPLIANCE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: vehicle, isLoading } = trpc.traffic.vehicle.getById.useQuery({ id });

  const deleteMutation = trpc.traffic.vehicle.delete.useMutation({
    onSuccess: () => { toast.success("Vehicle deleted"); router.push("/traffic/vehicles"); },
    onError: (err) => toast.error(err.message),
  });

  const deleteComplianceMutation = trpc.traffic.vehicle.deleteCompliance.useMutation({
    onSuccess: () => {
      toast.success("Compliance record deleted");
      utils.traffic.vehicle.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="animate-fade-in space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[400px] w-full" /></div>;
  if (!vehicle) return <p>Vehicle not found.</p>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{vehicle.plateNumber}</h1>
          <p className="text-muted-foreground">{vehicle.vehicleType.name} &middot; {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}</p>
        </div>
        <Badge variant={(TT_VEHICLE_STATUS_VARIANTS[vehicle.status] ?? "secondary") as never}>
          {TT_VEHICLE_STATUS_LABELS[vehicle.status]}
        </Badge>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="compliance">Compliance ({vehicle.compliances.length})</TabsTrigger>
          <TabsTrigger value="drivers">Drivers ({vehicle.driverVehicles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="space-y-2 pt-6 text-sm">
              <InfoRow label="Plate Number" value={vehicle.plateNumber} />
              <InfoRow label="Type" value={vehicle.vehicleType.name} />
              <InfoRow label="Make" value={vehicle.make ?? "—"} />
              <InfoRow label="Model" value={vehicle.model ?? "—"} />
              <InfoRow label="Year" value={vehicle.year?.toString() ?? "—"} />
              <InfoRow label="Color" value={vehicle.color ?? "—"} />
              <InfoRow label="VIN" value={vehicle.vinNumber ?? "—"} />
              <InfoRow label="Ownership" value={TT_VEHICLE_OWNERSHIP_LABELS[vehicle.ownership] ?? vehicle.ownership} />
              <InfoRow label="Supplier" value={vehicle.supplier?.name ?? "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Compliance Records</CardTitle>
              <AddComplianceDialog vehicleId={id} onSuccess={() => utils.traffic.vehicle.getById.invalidate({ id })} />
            </CardHeader>
            <CardContent>
              {vehicle.compliances.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No compliance records.</p>
              ) : (
                <div className="space-y-2">
                  {vehicle.compliances.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{TT_COMPLIANCE_TYPE_LABELS[c.type] ?? c.type}</span>
                      <div className="flex items-center gap-3">
                        <span>{c.documentRef ?? "—"}</span>
                        <Badge variant={new Date(c.expiryDate) < new Date() ? "destructive" : "success"}>
                          {new Date(c.expiryDate).toLocaleDateString()}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this compliance record?")) {
                              deleteComplianceMutation.mutate({ id: c.id });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers">
          <Card>
            <CardContent className="pt-6">
              {vehicle.driverVehicles.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No drivers assigned.</p>
              ) : (
                <div className="space-y-2">
                  {vehicle.driverVehicles.map((dv) => (
                    <div key={dv.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{dv.driver.user.name ?? dv.driver.user.email}</span>
                      {dv.isPrimary && <Badge>Primary</Badge>}
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
        <Button variant="destructive" onClick={() => { if (confirm("Delete this vehicle?")) deleteMutation.mutate({ id }); }}>Delete</Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

const COMPLIANCE_TYPES = ["INSURANCE", "REGISTRATION", "INSPECTION", "PERMIT", "OTHER"] as const;

function AddComplianceDialog({ vehicleId, onSuccess }: { vehicleId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("INSURANCE");
  const [expiryDate, setExpiryDate] = useState("");
  const [documentRef, setDocumentRef] = useState("");
  const [notes, setNotes] = useState("");

  const addMutation = trpc.traffic.vehicle.addCompliance.useMutation({
    onSuccess: () => {
      toast.success("Compliance record added");
      setOpen(false);
      resetForm();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setType("INSURANCE");
    setExpiryDate("");
    setDocumentRef("");
    setNotes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expiryDate) { toast.error("Expiry date is required"); return; }
    addMutation.mutate({
      vehicleId,
      type: type as (typeof COMPLIANCE_TYPES)[number],
      expiryDate: new Date(expiryDate),
      documentRef: documentRef || null,
      notes: notes || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Compliance</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Compliance Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPLIANCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{TT_COMPLIANCE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Document Reference</Label>
            <Input value={documentRef} onChange={(e) => setDocumentRef(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
