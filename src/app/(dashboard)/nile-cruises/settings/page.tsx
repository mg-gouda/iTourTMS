"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const SEQUENCE_LABELS: Record<string, string> = {
  cruise_contract: "Contract Numbers",
  cruise_departure: "Departure Codes",
  cruise_booking: "Booking References",
  cruise_voucher: "Voucher Codes",
};

export default function CruiseSettingsPage() {
  const utils = trpc.useUtils();
  const { data: sequences, isLoading } = trpc.nileCruises.settings.getSequences.useQuery();

  const ensureSequences = trpc.nileCruises.settings.ensureSequences.useMutation({
    onSuccess: () => { toast.success("Sequences initialized"); utils.nileCruises.settings.getSequences.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cruise Settings</h1>
        <p className="text-sm text-muted-foreground">Configure sequences, permissions and defaults</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Number Sequences</CardTitle>
          <CardDescription>
            These sequences generate unique codes for cruise entities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !sequences?.length ? (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Sequences not yet initialized</p>
              <Button onClick={() => ensureSequences.mutate()} disabled={ensureSequences.isPending}>
                {ensureSequences.isPending ? "Initializing..." : "Initialize Sequences"}
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {sequences.map((seq) => (
                <div key={seq.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{SEQUENCE_LABELS[seq.code] ?? seq.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Prefix: <span className="font-mono font-medium">{seq.prefix}</span>
                      {" · "}Next: <span className="font-mono font-medium">{seq.nextNumber}</span>
                      {" · "}Pad: <span className="font-mono font-medium">{seq.padding}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {seq.prefix}-{String(seq.nextNumber).padStart(seq.padding, "0")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {sequences && sequences.length > 0 && sequences.length < 4 && (
            <Button variant="outline" size="sm" onClick={() => ensureSequences.mutate()} disabled={ensureSequences.isPending}>
              Initialize Missing Sequences
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module Permissions</CardTitle>
          <CardDescription>Manage which roles have access to Nile Cruise features via the Admin → Roles section.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Permission codes follow the pattern <code className="text-xs bg-muted px-1 rounded">nile-cruises:[resource]:[action]</code>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["nile-cruises:boat:read", "nile-cruises:contract:read", "nile-cruises:departure:read", "nile-cruises:booking:read", "nile-cruises:manifest:read"].map((code) => (
              <Badge key={code} variant="secondary" className="font-mono text-xs">{code}</Badge>
            ))}
            <Badge variant="outline" className="text-xs">+ more</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
