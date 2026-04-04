"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

export default function EditMarkupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: markup, isLoading } = trpc.b2bPortal.markup.getById.useQuery({ id });

  const [name, setName] = useState("");
  const [markupType, setMarkupType] = useState("");
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState(0);
  const [active, setActive] = useState(true);
  const [initialized, setInitialized] = useState(false);

  if (markup && !initialized) {
    setName(markup.name);
    setMarkupType(markup.markupType);
    setValue(String(markup.value));
    setPriority(markup.priority);
    setActive(markup.active);
    setInitialized(true);
  }

  const updateMutation = trpc.b2bPortal.markup.update.useMutation({
    onSuccess: () => {
      toast.success("Markup rule updated");
      utils.b2bPortal.markup.list.invalidate();
      router.push("/b2b-portal/markups");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Loading...</div>;
  }

  if (!markup) {
    return <div className="py-10 text-center text-muted-foreground">Markup rule not found.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Markup Rule</h1>
        <p className="text-muted-foreground">{markup.name}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Markup Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Markup Type</Label>
              <Select value={markupType} onValueChange={setMarkupType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_PER_NIGHT">Fixed Per Night</SelectItem>
                  <SelectItem value="FIXED_PER_BOOKING">Fixed Per Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input type="number" min={0} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Active</Label>
            </div>
          </div>

          {/* Read-only scope info */}
          <div className="rounded-md border p-3 text-sm space-y-1">
            <p className="font-medium">Scope</p>
            {markup.contract && <p>Contract: {markup.contract.name}</p>}
            {markup.hotel && <p>Hotel: {markup.hotel.name}</p>}
            {markup.destination && <p>Destination: {markup.destination.name}</p>}
            {markup.market && <p>Market: {markup.market.name}</p>}
            {markup.tourOperator && <p>Tour Operator: {markup.tourOperator.name}</p>}
            {!markup.contract && !markup.hotel && !markup.destination && !markup.market && !markup.tourOperator && (
              <p className="text-muted-foreground">Global (no scope filter)</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              disabled={!name || !value || updateMutation.isPending}
              onClick={() =>
                updateMutation.mutate({
                  id,
                  data: {
                    name,
                    markupType: markupType as "PERCENTAGE" | "FIXED_PER_NIGHT" | "FIXED_PER_BOOKING",
                    value: Number(value),
                    priority,
                    active,
                  },
                })
              }
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
