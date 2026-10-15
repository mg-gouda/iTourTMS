"use client";

import { Building2, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

interface Draft {
  id?: string;
  code: string;
  name: string;
  destinationIds: string[];
  isHq: boolean;
  active: boolean;
}

const EMPTY: Draft = { code: "", name: "", destinationIds: [], isHq: false, active: true };

export function BranchesTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.branch.list.useQuery();
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = trpc.branch.save.useMutation({
    onSuccess: (b) => {
      toast.success(`${b.name} saved`);
      setDraft(null);
      utils.branch.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const branches = data?.branches ?? [];
  const destinations = data?.destinations ?? [];
  const destName = new Map(destinations.map((d) => [d.id, d.name]));

  const form = (d: Draft) => (
    <form
      className="grid gap-4 rounded-lg border bg-muted/30 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(d);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor="branch-code">Code</Label>
          <Input
            id="branch-code"
            value={d.code}
            maxLength={8}
            placeholder="HRG"
            className="font-mono uppercase"
            onChange={(e) => setDraft({ ...d, code: e.target.value.toUpperCase() })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="branch-name">Name</Label>
          <Input
            id="branch-name"
            value={d.name}
            placeholder="Hurghada"
            onChange={(e) => setDraft({ ...d, name: e.target.value })}
            required
          />
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Operates in</legend>
        <p className="text-muted-foreground text-xs">
          Transfers and invoices raised from a hotel booking in these destinations land in this
          branch. Unclaimed destinations go to head office.
        </p>
        {destinations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No destinations set up yet.</p>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {destinations.map((dest) => (
              <label key={dest.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={d.destinationIds.includes(dest.id)}
                  onCheckedChange={(on) =>
                    setDraft({
                      ...d,
                      destinationIds: on
                        ? [...d.destinationIds, dest.id]
                        : d.destinationIds.filter((x) => x !== dest.id),
                    })
                  }
                />
                {dest.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={d.isHq} onCheckedChange={(isHq) => setDraft({ ...d, isHq })} />
          Head office
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={d.active} onCheckedChange={(active) => setDraft({ ...d, active })} />
          Active
        </label>
        <div className="ms-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save branch"}
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Branches</CardTitle>
          <CardDescription>
            Each branch keeps its own transfers, fleet, CRM, tour-ops files and books. Hotels,
            contracts and price lists are shared. Assign people to branches under Users.
          </CardDescription>
        </div>
        {!draft && (
          <Button size="sm" onClick={() => setDraft(EMPTY)}>
            <Plus className="me-1 size-4" /> Add branch
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-2">
        {draft && !draft.id && form(draft)}

        <ul className="divide-y rounded-lg border">
          {branches.map((b) =>
            draft?.id === b.id ? (
              <li key={b.id} className="p-2">
                {form(draft)}
              </li>
            ) : (
              <li key={b.id} className="flex items-center gap-4 px-4 py-3">
                <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">{b.code}</span>
                    {b.isHq && <Badge>Head office</Badge>}
                    {!b.active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {b.destinationIds.length
                      ? b.destinationIds.map((id) => destName.get(id) ?? "—").join(" · ")
                      : b.isHq
                        ? "Everything no other branch claims"
                        : "No destinations yet"}
                    {" — "}
                    {b._count.users} {b._count.users === 1 ? "person" : "people"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${b.name}`}
                  disabled={!!draft}
                  onClick={() =>
                    setDraft({
                      id: b.id,
                      code: b.code,
                      name: b.name,
                      destinationIds: b.destinationIds,
                      isHq: b.isHq,
                      active: b.active,
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
              </li>
            ),
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
