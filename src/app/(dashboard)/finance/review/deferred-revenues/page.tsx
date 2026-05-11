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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATE_VARIANTS: Record<string, "outline" | "default" | "secondary"> = { DRAFT: "outline", RUNNING: "default", CLOSED: "secondary" };

type DRRow = {
  id: string;
  name: string;
  state: string;
  amount: string;
  recognizedAmount: string;
  startDate: string;
  endDate: string;
  account: { code: string; name: string };
  revenueAccount: { code: string; name: string };
};

export default function DeferredRevenuesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.deferredRevenue.list.useQuery({});
  const { data: accounts } = trpc.finance.account.list.useQuery({});
  const createMut = trpc.finance.deferredRevenue.create.useMutation({ onSuccess: () => { utils.finance.deferredRevenue.list.invalidate(); setOpen(false); toast.success("Deferred revenue created"); } });
  const closeMut = trpc.finance.deferredRevenue.close.useMutation({ onSuccess: () => { utils.finance.deferredRevenue.list.invalidate(); toast.success("Closed"); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", startDate: "", endDate: "", accountId: "", revenueAccountId: "" });

  const columns: ColumnDef<DRRow, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { id: "amount", accessorFn: (r) => r.amount, header: ({ column }) => <DataTableColumnHeader column={column} title="Total Amount" />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.amount).toFixed(2)}</span> },
    {
      id: "recognized",
      accessorFn: (r) => r.recognizedAmount,
      header: "Recognized",
      cell: ({ row }) => {
        const pct = Number(row.original.amount) > 0 ? (Number(row.original.recognizedAmount) / Number(row.original.amount) * 100).toFixed(0) : 0;
        return <span className="font-mono tabular-nums">{Number(row.original.recognizedAmount).toFixed(2)} <span className="text-muted-foreground text-xs">({pct}%)</span></span>;
      },
    },
    { id: "startDate", accessorFn: (r) => r.startDate, header: ({ column }) => <DataTableColumnHeader column={column} title="Start" />, cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString() },
    { id: "endDate", accessorFn: (r) => r.endDate, header: ({ column }) => <DataTableColumnHeader column={column} title="End" />, cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString() },
    { id: "account", accessorFn: (r) => r.account.name, header: "Deferred Account", cell: ({ row }) => <span className="font-mono text-xs">{row.original.account.code}</span> },
    { id: "revAccount", accessorFn: (r) => r.revenueAccount.name, header: "Revenue Account", cell: ({ row }) => <span className="font-mono text-xs">{row.original.revenueAccount.code}</span> },
    { accessorKey: "state", header: "Status", cell: ({ row }) => <Badge variant={STATE_VARIANTS[row.getValue("state") as string] ?? "outline"}>{row.getValue("state") as string}</Badge> },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.state !== "CLOSED" && <DropdownMenuItem onClick={() => closeMut.mutate({ id: row.original.id })}>Close</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deferred Revenues</h1>
          <p className="text-muted-foreground">Revenue recognition schedules spread over time.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />New</Button>
      </div>
      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(data as any) ?? []} searchKey="name" searchPlaceholder="Search..." />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Deferred Revenue</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Total Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Deferred Revenue Account</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">Select account...</option>
                {(accounts?.items ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Revenue Recognition Account</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.revenueAccountId} onChange={(e) => setForm({ ...form, revenueAccountId: e.target.value })}>
                <option value="">Select account...</option>
                {(accounts?.items ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate({ ...form, amount: Number(form.amount) })}>Create & Generate Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
