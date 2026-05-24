"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

export default function CruiseTemplatesPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [cloneContractId, setCloneContractId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");

  const { data: contracts, isLoading } = trpc.nileCruises.contract.list.useQuery();

  const cloneContract = trpc.nileCruises.template.cloneContract.useMutation({
    onSuccess: (data) => {
      toast.success(`Contract ${data.code} cloned`);
      setCloneContractId(null);
      router.push(`/nile-cruises/contracts/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const sourceContract = contracts?.find((c) => c.id === cloneContractId);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-sm text-muted-foreground">Clone contracts and departures from existing records</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clone Contract</CardTitle>
            <CardDescription>Create a new contract with the same rates, seasons, and configuration as an existing one</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-10" /> : (
              <div className="space-y-3">
                {contracts?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <p className="text-sm font-medium">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.name}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setCloneContractId(c.id); setNewName(`${c.name} (Copy)`); }}>
                      Clone
                    </Button>
                  </div>
                ))}
                {!contracts?.length && <p className="text-sm text-muted-foreground">No contracts to clone</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Templates</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Cloning a contract copies:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All seasons</li>
              <li>Base rates matrix</li>
              <li>Supplements</li>
              <li>Child policies</li>
              <li>Market & TO markup rules</li>
            </ul>
            <p className="text-xs">Offers, stop sales, and allotments are NOT copied.</p>
          </CardContent>
        </Card>
      </div>

      {/* Clone Dialog */}
      <Dialog open={!!cloneContractId} onOpenChange={() => setCloneContractId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Contract</DialogTitle>
          </DialogHeader>
          {sourceContract && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Cloning: <strong>{sourceContract.code}</strong> — {sourceContract.name}</p>
              <div className="space-y-2">
                <Label>New Contract Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Contract name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input type="date" value={newFrom} onChange={(e) => setNewFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valid To</Label>
                  <Input type="date" value={newTo} onChange={(e) => setNewTo(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setCloneContractId(null)}>Cancel</Button>
                <Button
                  disabled={!newName || !newFrom || !newTo || cloneContract.isPending}
                  onClick={() => cloneContract.mutate({
                    sourceContractId: cloneContractId!,
                    newName,
                    newValidFrom: newFrom,
                    newValidTo: newTo,
                  })}
                >
                  {cloneContract.isPending ? "Cloning..." : "Clone Contract"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
