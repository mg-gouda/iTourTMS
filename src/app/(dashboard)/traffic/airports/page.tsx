"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AirportsPage() {
  const utils = trpc.useUtils();
  const { data: airports, isLoading } = trpc.traffic.airport.list.useQuery();
  const { data: countries } = trpc.setup.getCountries.useQuery();

  // Create dialog
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editCountryId, setEditCountryId] = useState("");

  const createMutation = trpc.traffic.airport.create.useMutation({
    onSuccess: () => {
      utils.traffic.airport.invalidate();
      setOpen(false);
      setCode(""); setName(""); setCountryId("");
      toast.success("Airport created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.traffic.airport.update.useMutation({
    onSuccess: () => {
      utils.traffic.airport.invalidate();
      setEditOpen(false);
      toast.success("Airport updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.traffic.airport.delete.useMutation({
    onSuccess: () => { utils.traffic.airport.invalidate(); toast.success("Airport deleted"); },
    onError: (err) => toast.error(err.message),
  });

  function openEdit(a: NonNullable<typeof airports>[number]) {
    setEditId(a.id);
    setEditCode(a.code);
    setEditName(a.name);
    setEditCountryId(a.countryId);
    setEditOpen(true);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Airports</h1><p className="text-muted-foreground">Manage airport codes for transfers</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Airport</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Airport</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>IATA Code</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. CAI" maxLength={4} /></div>
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cairo International Airport" /></div>
              <div>
                <Label>Country</Label>
                <Select value={countryId} onValueChange={setCountryId}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate({ code, name, countryId })} disabled={createMutation.isPending || !code || !name || !countryId}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Airport</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>IATA Code</Label><Input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} maxLength={4} /></div>
            <div><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div>
              <Label>Country</Label>
              <Select value={editCountryId} onValueChange={setEditCountryId}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => updateMutation.mutate({ id: editId, data: { code: editCode, name: editName, countryId: editCountryId } })} disabled={updateMutation.isPending || !editCode || !editName || !editCountryId}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : (
        <div className="space-y-2">
          {airports?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border p-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="font-mono">{a.code}</Badge>
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-muted-foreground">{a.country.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: a.id }); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {airports?.length === 0 && <p className="py-8 text-center text-muted-foreground">No airports yet.</p>}
        </div>
      )}
    </div>
  );
}
