"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/shared/permission-guard";

type UCRow = {
  id: string;
  name: string;
  date: string;
  gainLoss: string;
  isReversed: boolean;
  currency: { code: string; symbol: string; name: string };
};

export default function UnrealizedCurrenciesPage() {
  const utils = trpc.useUtils();
  const { data: entries, isLoading } = trpc.finance.unrealizedCurrency.list.useQuery();
  const { data: positions } = trpc.finance.unrealizedCurrency.computePositions.useQuery();
  const createMut = trpc.finance.unrealizedCurrency.create.useMutation({
    onSuccess: () => { utils.finance.unrealizedCurrency.list.invalidate(); setOpen(false); toast.success("Entry created"); },
  });
  const reverseMut = trpc.finance.unrealizedCurrency.reverse.useMutation({
    onSuccess: () => { utils.finance.unrealizedCurrency.list.invalidate(); toast.success("Reversed"); },
  });

  const [open, setOpen] = useState(false);
  const { data: currencies } = trpc.finance.currency.list.useQuery();
  const [form, setForm] = useState({ name: "", date: new Date().toISOString().split("T")[0], currencyId: "", gainLoss: "", notes: "" });

  const totalGain = (entries ?? []).filter((e: any) => !e.isReversed).reduce((s: number, e: any) => s + Number(e.gainLoss), 0);

  const columns: ColumnDef<UCRow, unknown>[] = [
    { accessorKey: "name", header: "Reference" },
    { id: "date", accessorFn: (r) => r.date, header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />, cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { id: "currency", accessorFn: (r) => r.currency.code, header: "Currency", cell: ({ row }) => <Badge variant="outline" className="font-mono">{row.original.currency.code}</Badge> },
    {
      id: "gainLoss",
      accessorFn: (r) => r.gainLoss,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Gain / Loss" />,
      cell: ({ row }) => {
        const val = Number(row.original.gainLoss);
        return <span className={`font-mono tabular-nums font-semibold ${val >= 0 ? "text-green-600" : "text-destructive"}`}>{val >= 0 ? "+" : ""}{val.toFixed(2)}</span>;
      },
    },
    {
      accessorKey: "isReversed",
      header: "Status",
      cell: ({ row }) => row.getValue("isReversed") ? <Badge variant="secondary">Reversed</Badge> : <Badge variant="default">Active</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => !row.original.isReversed ? (
        <Button size="sm" variant="outline" onClick={() => reverseMut.mutate({ id: row.original.id })}>Reverse</Button>
      ) : null,
    },
  ];

  return (
    <PermissionGuard permission="finance:auditTrail:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unrealized Currencies</h1>
          <p className="text-muted-foreground">Foreign currency revaluation entries for open positions.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />New Entry</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Unrealized Gain/Loss</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold tabular-nums ${totalGain >= 0 ? "text-green-600" : "text-destructive"}`}>{totalGain >= 0 ? "+" : ""}{totalGain.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Open FX Positions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{positions?.length ?? 0}</p></CardContent>
        </Card>
      </div>

      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(entries as any) ?? []} searchKey="name" searchPlaceholder="Search entries..." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Unrealized Currency Entry</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label>Reference</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Currency</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.currencyId} onChange={(e) => setForm({ ...form, currencyId: e.target.value })}>
                  <option value="">Select...</option>
                  {(currencies ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5"><Label>Gain / Loss Amount</Label><Input type="number" step="0.01" placeholder="Positive = gain, negative = loss" value={form.gainLoss} onChange={(e) => setForm({ ...form, gainLoss: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate({ ...form, gainLoss: Number(form.gainLoss) })}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  );
}
