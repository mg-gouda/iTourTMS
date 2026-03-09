"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const MARKUP_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: "Percentage",
  FIXED_PER_NIGHT: "Fixed per Night",
  FIXED_PER_BOOKING: "Fixed per Booking",
};

const MARKUP_TYPE_SHORT: Record<string, string> = {
  PERCENTAGE: "%",
  FIXED_PER_NIGHT: "/night",
  FIXED_PER_BOOKING: "/booking",
};

type MarkupRow = {
  id: string;
  name: string;
  markupType: string;
  value: unknown;
  priority: number;
  active: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  tourOperator?: { id: string; name: string } | null;
  hotel?: { id: string; name: string } | null;
  destination?: { id: string; name: string } | null;
  market?: { id: string; name: string } | null;
};

function scopeLabel(row: MarkupRow) {
  const parts: string[] = [];
  if (row.hotel) parts.push(`Hotel: ${row.hotel.name}`);
  if (row.destination) parts.push(`Dest: ${row.destination.name}`);
  if (row.market) parts.push(`Market: ${row.market.name}`);
  if (row.tourOperator) parts.push(`TO: ${row.tourOperator.name}`);
  return parts.length > 0 ? parts.join(", ") : "Global";
}

const columns: ColumnDef<MarkupRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "markupType",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline">
        {MARKUP_TYPE_LABELS[row.original.markupType] ?? row.original.markupType}
      </Badge>
    ),
  },
  {
    id: "value",
    header: "Value",
    cell: ({ row }) => (
      <span>
        {Number(row.original.value)}{MARKUP_TYPE_SHORT[row.original.markupType] ?? ""}
      </span>
    ),
  },
  {
    id: "scope",
    header: "Scope",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{scopeLabel(row.original)}</span>
    ),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
  },
  {
    id: "validFrom",
    header: "Valid From",
    cell: ({ row }) =>
      row.original.validFrom
        ? new Date(row.original.validFrom).toLocaleDateString()
        : "—",
  },
  {
    id: "validTo",
    header: "Valid To",
    cell: ({ row }) =>
      row.original.validTo
        ? new Date(row.original.validTo).toLocaleDateString()
        : "—",
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.active ? "default" : "secondary"}>
        {row.original.active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

const defaultForm = {
  name: "",
  markupType: "PERCENTAGE",
  value: 0,
  tourOperatorId: "",
  hotelId: "",
  priority: 0,
  active: true,
  validFrom: "",
  validTo: "",
};

export default function B2bMarkupsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.b2bPortal.markup.list.useQuery();
  const { data: toList } = trpc.b2bPortal.tourOperator.list.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [toFilter, setToFilter] = useState<string>("all");

  const createMutation = trpc.b2bPortal.markup.create.useMutation({
    onSuccess: () => {
      toast.success("Markup rule created");
      utils.b2bPortal.markup.list.invalidate();
      setDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.b2bPortal.markup.delete.useMutation({
    onSuccess: () => {
      toast.success("Markup rule deleted");
      utils.b2bPortal.markup.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    let rows = (data ?? []) as MarkupRow[];
    if (toFilter !== "all") {
      rows = rows.filter((r) => r.tourOperator?.id === toFilter);
    }
    return rows;
  }, [data, toFilter]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name: form.name,
      markupType: form.markupType as "PERCENTAGE" | "FIXED_PER_NIGHT" | "FIXED_PER_BOOKING",
      value: form.value,
      tourOperatorId: form.tourOperatorId || undefined,
      hotelId: form.hotelId || undefined,
      priority: form.priority,
      active: form.active,
      validFrom: form.validFrom ? new Date(form.validFrom) : undefined,
      validTo: form.validTo ? new Date(form.validTo) : undefined,
    });
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Markup Rules</h1>
          <p className="text-muted-foreground">Configure partner-specific markup and pricing rules</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setDialogOpen(true); }}>
          <Plus className="mr-2 size-4" /> New Rule
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={[
            ...columns,
            {
              id: "actions",
              cell: ({ row }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this markup rule?"))
                      deleteMutation.mutate({ id: row.original.id });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              ),
            },
          ] as ColumnDef<MarkupRow>[]}
          data={filtered}
          searchKey="name"
          searchPlaceholder="Search markup rules..."
          toolbar={
            <Select value={toFilter} onValueChange={setToFilter}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="All Tour Operators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tour Operators</SelectItem>
                {(toList ?? []).map((to: { id: string; name: string }) => (
                  <SelectItem key={to.id} value={to.id}>{to.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setForm(defaultForm); } else setDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Markup Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Markup Type</Label>
              <Select value={form.markupType} onValueChange={(v) => setForm({ ...form, markupType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MARKUP_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div>
              <Label>Tour Operator</Label>
              <Select value={form.tourOperatorId || "none"} onValueChange={(v) => setForm({ ...form, tourOperatorId: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(toList ?? []).map((to: { id: string; name: string }) => (
                    <SelectItem key={to.id} value={to.id}>{to.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hotel ID (optional)</Label>
              <Input value={form.hotelId} onChange={(e) => setForm({ ...form, hotelId: e.target.value })} placeholder="Leave empty for all hotels" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: !!c })} id="active" />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valid From</Label>
                <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </div>
              <div>
                <Label>Valid To</Label>
                <Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
              </div>
            </div>

            {createMutation.error && (
              <p className="text-sm text-destructive">{createMutation.error.message}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setForm(defaultForm); }}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
