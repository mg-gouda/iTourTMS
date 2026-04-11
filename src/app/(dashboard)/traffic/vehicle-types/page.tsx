"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function VehicleTypesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.traffic.vehicleType.list.useQuery();

  // Create
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState(4);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCapacity, setEditCapacity] = useState(4);

  const createMutation = trpc.traffic.vehicleType.create.useMutation({
    onSuccess: () => { utils.traffic.vehicleType.invalidate(); setOpen(false); setName(""); setCode(""); setCapacity(4); toast.success("Vehicle type created"); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.traffic.vehicleType.update.useMutation({
    onSuccess: () => { utils.traffic.vehicleType.invalidate(); setEditOpen(false); toast.success("Vehicle type updated"); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.traffic.vehicleType.delete.useMutation({
    onSuccess: () => { utils.traffic.vehicleType.invalidate(); toast.success("Deleted"); },
    onError: (err) => toast.error(err.message),
  });

  function openEdit(vt: NonNullable<typeof data>[number]) {
    setEditId(vt.id);
    setEditName(vt.name);
    setEditCode(vt.code);
    setEditCapacity(vt.capacity);
    setEditOpen(true);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehicle Types</h1>
          <p className="text-muted-foreground">Categories of vehicles in your fleet</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Type</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Vehicle Type</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sedan" /></div>
              <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SED" /></div>
              <div><Label>Capacity</Label><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></div>
              <Button onClick={() => createMutation.mutate({ name, code, capacity })} disabled={createMutation.isPending || !name || !code}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Vehicle Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>Code</Label><Input value={editCode} onChange={(e) => setEditCode(e.target.value)} /></div>
            <div><Label>Capacity</Label><Input type="number" min={1} value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} /></div>
            <Button onClick={() => updateMutation.mutate({ id: editId, data: { name: editName, code: editCode, capacity: editCapacity } })} disabled={updateMutation.isPending || !editName || !editCode}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((vt) => (
            <Card key={vt.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{vt.name}</p>
                  <p className="text-sm text-muted-foreground">Code: {vt.code} &middot; Capacity: {vt.capacity}</p>
                  <Badge variant="outline" className="mt-1">{vt._count.vehicles} vehicles</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(vt)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: vt.id }); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">No vehicle types yet.</p>}
        </div>
      )}
    </div>
  );
}
