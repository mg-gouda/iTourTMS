"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function ZonesPage() {
  const utils = trpc.useUtils();
  const { data: zones, isLoading } = trpc.traffic.zone.list.useQuery();
  const { data: cities } = trpc.contracting.destination.listAllCities.useQuery();

  // Create
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [cityId, setCityId] = useState("");

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const createMutation = trpc.traffic.zone.create.useMutation({
    onSuccess: () => { utils.traffic.zone.invalidate(); setOpen(false); setName(""); setCode(""); setCityId(""); toast.success("Zone created"); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.traffic.zone.update.useMutation({
    onSuccess: () => { utils.traffic.zone.invalidate(); setEditOpen(false); toast.success("Zone updated"); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.traffic.zone.delete.useMutation({
    onSuccess: () => { utils.traffic.zone.invalidate(); toast.success("Zone deleted"); },
    onError: (err) => toast.error(err.message),
  });

  // Group zones by city
  const grouped = new Map<string, typeof zones>();
  zones?.forEach((z) => {
    const key = z.city?.name ?? "Unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(z);
  });

  function openEdit(z: NonNullable<typeof zones>[number]) {
    setEditId(z.id);
    setEditName(z.name);
    setEditCode(z.code);
    setEditOpen(true);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Transport Zones</h1><p className="text-muted-foreground">Manage pricing and coverage zones</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Zone</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Zone</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>City</Label>
                <Select value={cityId} onValueChange={setCityId}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>{cities?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zone A" /></div>
              <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ZA" /></div>
              <Button onClick={() => createMutation.mutate({ name, code, cityId })} disabled={createMutation.isPending || !name || !code || !cityId}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Zone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>Code</Label><Input value={editCode} onChange={(e) => setEditCode(e.target.value)} /></div>
            <Button onClick={() => updateMutation.mutate({ id: editId, data: { name: editName, code: editCode } })} disabled={updateMutation.isPending || !editName || !editCode}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div> : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([cityName, cityZones]) => (
            <Card key={cityName}>
              <CardHeader><CardTitle>{cityName}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cityZones?.map((z) => (
                    <div key={z.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span>{z.name} <span className="text-muted-foreground">({z.code})</span></span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(z)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: z.id }); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {grouped.size === 0 && <p className="py-8 text-center text-muted-foreground">No zones yet. Create your first zone.</p>}
        </div>
      )}
    </div>
  );
}
