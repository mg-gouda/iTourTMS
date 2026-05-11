"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATE_VARIANTS: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  DRAFT: "outline",
  OPEN: "default",
  CLOSED: "secondary",
};
const STATE_LABELS: Record<string, string> = { DRAFT: "Draft", OPEN: "Running", CLOSED: "Closed" };

type AssetRow = {
  id: string;
  name: string;
  code: string | null;
  state: string;
  method: string;
  originalValue: string;
  netBookValue: string;
  accumulatedDepreciation: string;
  usefulLifeYears: number;
  acquisitionDate: string;
  account: { code: string; name: string };
  _count: { depreciationLines: number };
};

export default function AssetsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.asset.list.useQuery({});
  const { data: accounts } = trpc.finance.account.list.useQuery({ accountType: "ASSET_FIXED" });
  const createMut = trpc.finance.asset.create.useMutation({ onSuccess: () => { utils.finance.asset.list.invalidate(); setOpen(false); toast.success("Asset created"); } });
  const computeMut = trpc.finance.asset.compute.useMutation({ onSuccess: () => { utils.finance.asset.list.invalidate(); toast.success("Depreciation schedule computed"); } });
  const closeMut = trpc.finance.asset.close.useMutation({ onSuccess: () => { utils.finance.asset.list.invalidate(); toast.success("Asset closed"); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", accountId: "", originalValue: "", salvageValue: "0", usefulLifeYears: "5", acquisitionDate: new Date().toISOString().split("T")[0], method: "STRAIGHT_LINE" });

  const columns: ColumnDef<AssetRow, unknown>[] = [
    { accessorKey: "name", header: "Asset Name" },
    { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-mono">{row.getValue("code") ?? "—"}</span> },
    { id: "account", accessorFn: (r) => r.account.name, header: "Asset Account", cell: ({ row }) => <span><span className="font-mono text-muted-foreground mr-1">{row.original.account.code}</span>{row.original.account.name}</span> },
    {
      accessorKey: "state",
      header: "Status",
      cell: ({ row }) => <Badge variant={STATE_VARIANTS[row.getValue("state") as string] ?? "outline"}>{STATE_LABELS[row.getValue("state") as string] ?? row.getValue("state")}</Badge>,
    },
    { id: "original", accessorFn: (r) => r.originalValue, header: ({ column }) => <DataTableColumnHeader column={column} title="Original Value" />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.originalValue).toFixed(2)}</span> },
    { id: "netBook", accessorFn: (r) => r.netBookValue, header: "Net Book Value", cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.netBookValue).toFixed(2)}</span> },
    { id: "acqDate", accessorFn: (r) => r.acquisitionDate, header: ({ column }) => <DataTableColumnHeader column={column} title="Acquisition Date" />, cell: ({ row }) => new Date(row.original.acquisitionDate).toLocaleDateString() },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.state === "DRAFT" && (
              <DropdownMenuItem onClick={() => computeMut.mutate({ id: row.original.id })}>Compute Depreciation</DropdownMenuItem>
            )}
            {row.original.state === "OPEN" && (
              <DropdownMenuItem onClick={() => closeMut.mutate({ id: row.original.id })}>Close Asset</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Fixed asset register with depreciation scheduling.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />New Asset</Button>
      </div>

      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(data as any) ?? []} searchKey="name" searchPlaceholder="Search assets..." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Fixed Asset</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label>Asset Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Asset Account</Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{(accounts?.items ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Original Value</Label><Input type="number" value={form.originalValue} onChange={(e) => setForm({ ...form, originalValue: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Salvage Value</Label><Input type="number" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Useful Life (Years)</Label><Input type="number" value={form.usefulLifeYears} onChange={(e) => setForm({ ...form, usefulLifeYears: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Acquisition Date</Label><Input type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Depreciation Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                  <SelectItem value="DEGRESSIVE">Degressive (DB)</SelectItem>
                  <SelectItem value="DEGRESSIVE_THEN_STRAIGHT_LINE">Degressive then Straight Line</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate({ ...form, originalValue: Number(form.originalValue), salvageValue: Number(form.salvageValue), usefulLifeYears: Number(form.usefulLifeYears), method: form.method as any })}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
