"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ToggleChips } from "@/components/crm/toggle-chips";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useBranchColumns } from "@/hooks/use-branch-columns";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";

type Team = inferRouterOutputs<AppRouter>["crm"]["salesTeam"]["list"][number];
type Draft = { id?: string; name: string; leaderId: string; memberIds: string[]; marketIds: string[]; active: boolean };

const EMPTY: Draft = { name: "", leaderId: "", memberIds: [], marketIds: [], active: true };
const NONE = "__none";

export default function SalesTeamsPage() {
  const utils = trpc.useUtils();
  const { data: teams, isLoading } = trpc.crm.salesTeam.list.useQuery();
  const { data: options } = trpc.crm.salesTeam.options.useQuery();
  const { data: users } = trpc.user.list.useQuery();
  const [draft, setDraft] = useState<Draft | null>(null);

  const markets = new Map((options?.markets ?? []).map((m) => [m.id, m.name]));
  const done = (msg: string) => {
    utils.crm.salesTeam.list.invalidate();
    setDraft(null);
    toast.success(msg);
  };
  const save = trpc.crm.salesTeam.save.useMutation({ onSuccess: () => done("Team saved"), onError: (e) => toast.error(e.message) });
  const remove = trpc.crm.salesTeam.delete.useMutation({ onSuccess: () => done("Team deleted"), onError: (e) => toast.error(e.message) });

  const columns: ColumnDef<Team>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
      cell: ({ row }) => (
        <span className="flex items-center gap-2 font-medium">
          {row.original.name}
          {!row.original.active && <Badge variant="secondary">Inactive</Badge>}
        </span>
      ),
    },
    {
      id: "territory",
      header: "Territory",
      accessorFn: (t) => t.marketIds.map((id) => markets.get(id)).join(", "),
      cell: ({ row }) =>
        row.original.marketIds.length ? (
          <span className="flex flex-wrap gap-1">
            {row.original.marketIds.map((id) => (
              <Badge key={id} variant="outline" className="font-normal">
                {markets.get(id) ?? "—"}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">No markets: gets leads only by hand</span>
        ),
    },
    {
      id: "leader",
      header: "Leader",
      accessorFn: (t) => t.leader?.name ?? "",
      cell: ({ row }) => row.original.leader?.name ?? "—",
    },
    {
      id: "members",
      header: "Members",
      accessorFn: (t) => t.members.length,
      cell: ({ row }) => (
        <span title={row.original.members.map((m) => m.name ?? m.email).join(", ")}>{row.original.members.length}</span>
      ),
    },
    {
      id: "open",
      accessorFn: (t) => t.openLeads,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Open leads" />,
      cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.openLeads}</span>,
    },
    {
      id: "won",
      accessorFn: (t) => t.wonLeads,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Won" />,
      cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.wonLeads}</span>,
    },
  ];
  const shown = useBranchColumns(columns);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const people = (users ?? []).map((u) => ({ value: u.id, label: u.name ?? u.email }));

  return (
    <PermissionGuard permission="crm:lead:read">
      <div className="animate-fade-in space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales teams</h1>
            <p className="text-muted-foreground max-w-prose">
              Each team works a territory of markets. A new lead from one of those countries goes to the team member with
              the fewest open leads.
            </p>
          </div>
          <Button onClick={() => setDraft(EMPTY)}>
            <Plus className="me-2 size-4" /> New team
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !teams?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
            <Users className="text-muted-foreground size-8" aria-hidden />
            <div>
              <p className="font-medium">No sales teams yet</p>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Create one per market you sell to (say “UK & Ireland”), add its people, and leads start routing
                themselves.
              </p>
            </div>
            <Button variant="outline" onClick={() => setDraft(EMPTY)}>
              <Plus className="me-2 size-4" /> Create the first team
            </Button>
          </div>
        ) : (
          <DataTable
            columns={shown}
            data={teams}
            searchKey="name"
            searchPlaceholder="Search teams…"
            onRowClick={(t) =>
              setDraft({
                id: t.id,
                name: t.name,
                leaderId: t.leaderId ?? "",
                memberIds: t.members.map((m) => m.id),
                marketIds: t.marketIds,
                active: t.active,
              })
            }
          />
        )}
      </div>

      <Sheet open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{draft?.id ? "Edit team" : "New team"}</SheetTitle>
            <SheetDescription>Markets decide which leads the team receives.</SheetDescription>
          </SheetHeader>
          {draft && (
            <form
              id="team-form"
              className="flex-1 space-y-5 overflow-y-auto px-4 pb-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({ ...draft, leaderId: draft.leaderId || null });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Name</Label>
                <Input id="team-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Territory (markets)</Label>
                <ToggleChips
                  label="Markets"
                  options={(options?.markets ?? []).map((m) => ({ value: m.id, label: m.name }))}
                  value={draft.marketIds}
                  onChange={(marketIds) => set({ marketIds })}
                  emptyHint="No markets: the team only gets leads assigned by hand."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Members</Label>
                <ToggleChips
                  label="Members"
                  options={people}
                  value={draft.memberIds}
                  onChange={(memberIds) => set({ memberIds })}
                  emptyHint="With no members, routed leads go to the leader."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Leader</Label>
                <Select value={draft.leaderId || NONE} onValueChange={(v) => set({ leaderId: v === NONE ? "" : v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No leader</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label htmlFor="team-active">Active (receives routed leads)</Label>
                <Switch id="team-active" checked={draft.active} onCheckedChange={(active) => set({ active })} />
              </div>
            </form>
          )}
          <SheetFooter className="flex-row justify-between border-t">
            {draft?.id ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={remove.isPending}
                onClick={() => confirm("Delete this team? Its leads keep their assignee.") && remove.mutate({ id: draft.id! })}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" form="team-form" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save team"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PermissionGuard>
  );
}
