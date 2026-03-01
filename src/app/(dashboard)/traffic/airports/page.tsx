"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AirportsPage() {
  const utils = trpc.useUtils();
  const { data: airports, isLoading } = trpc.traffic.airport.list.useQuery();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("");

  const createMutation = trpc.traffic.airport.create.useMutation({
    onSuccess: () => { utils.traffic.airport.invalidate(); setOpen(false); setCode(""); setName(""); toast.success("Airport created"); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.traffic.airport.delete.useMutation({
    onSuccess: () => { utils.traffic.airport.invalidate(); toast.success("Airport deleted"); },
    onError: (err) => toast.error(err.message),
  });

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
              <div><Label>Country ID</Label><Input value={countryId} onChange={(e) => setCountryId(e.target.value)} placeholder="Country ID" /></div>
              <Button onClick={() => createMutation.mutate({ code, name, countryId })} disabled={createMutation.isPending || !code || !name || !countryId}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: a.id }); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {airports?.length === 0 && <p className="py-8 text-center text-muted-foreground">No airports yet.</p>}
        </div>
      )}
    </div>
  );
}
