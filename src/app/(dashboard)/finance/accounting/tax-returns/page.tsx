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

const STATE_VARIANTS: Record<string, "outline" | "default" | "secondary"> = { DRAFT: "outline", CONFIRMED: "default", FILED: "secondary" };
const STATE_LABELS: Record<string, string> = { DRAFT: "Draft", CONFIRMED: "Confirmed", FILED: "Filed" };

type TaxReturnRow = {
  id: string;
  name: string;
  state: string;
  dateFrom: string;
  dateTo: string;
  totalTax: string;
  totalDue: string;
  filedAt: string | null;
  filedBy: string | null;
  period: { name: string } | null;
};

export default function TaxReturnsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.taxReturn.list.useQuery({});
  const createMut = trpc.finance.taxReturn.create.useMutation({ onSuccess: () => { utils.finance.taxReturn.list.invalidate(); setOpen(false); toast.success("Tax return created"); } });
  const computeMut = trpc.finance.taxReturn.compute.useMutation({ onSuccess: () => { utils.finance.taxReturn.list.invalidate(); toast.success("Tax amounts computed"); } });
  const confirmMut = trpc.finance.taxReturn.confirm.useMutation({ onSuccess: () => { utils.finance.taxReturn.list.invalidate(); toast.success("Return confirmed"); } });
  const fileMut = trpc.finance.taxReturn.file.useMutation({ onSuccess: () => { utils.finance.taxReturn.list.invalidate(); toast.success("Return filed"); } });
  const deleteMut = trpc.finance.taxReturn.delete.useMutation({ onSuccess: () => { utils.finance.taxReturn.list.invalidate(); toast.success("Deleted"); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", dateFrom: "", dateTo: "" });

  const columns: ColumnDef<TaxReturnRow, unknown>[] = [
    { accessorKey: "name", header: "Reference" },
    { id: "period", accessorFn: (r) => r.period?.name ?? "—", header: "Period" },
    { id: "dateFrom", accessorFn: (r) => r.dateFrom, header: ({ column }) => <DataTableColumnHeader column={column} title="From" />, cell: ({ row }) => new Date(row.original.dateFrom).toLocaleDateString() },
    { id: "dateTo", accessorFn: (r) => r.dateTo, header: ({ column }) => <DataTableColumnHeader column={column} title="To" />, cell: ({ row }) => new Date(row.original.dateTo).toLocaleDateString() },
    { id: "totalTax", accessorFn: (r) => r.totalTax, header: ({ column }) => <DataTableColumnHeader column={column} title="Total Tax" />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.totalTax).toFixed(2)}</span> },
    { id: "totalDue", accessorFn: (r) => r.totalDue, header: "Total Due", cell: ({ row }) => <span className="font-mono tabular-nums font-semibold">{Number(row.original.totalDue).toFixed(2)}</span> },
    { accessorKey: "state", header: "Status", cell: ({ row }) => <Badge variant={STATE_VARIANTS[row.getValue("state") as string] ?? "outline"}>{STATE_LABELS[row.getValue("state") as string] ?? row.getValue("state")}</Badge> },
    { id: "filed", accessorFn: (r) => r.filedAt, header: "Filed On", cell: ({ row }) => row.original.filedAt ? <span>{new Date(row.original.filedAt).toLocaleDateString()} <span className="text-muted-foreground">by {row.original.filedBy}</span></span> : "—" },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => computeMut.mutate({ id: row.original.id })}>Compute Taxes</DropdownMenuItem>
            {row.original.state === "DRAFT" && <DropdownMenuItem onClick={() => confirmMut.mutate({ id: row.original.id })}>Confirm</DropdownMenuItem>}
            {row.original.state === "CONFIRMED" && <DropdownMenuItem onClick={() => fileMut.mutate({ id: row.original.id })}>Mark as Filed</DropdownMenuItem>}
            {row.original.state === "DRAFT" && <DropdownMenuItem className="text-destructive" onClick={() => deleteMut.mutate({ id: row.original.id })}>Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax Returns</h1>
          <p className="text-muted-foreground">VAT and tax declaration periods.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />New Return</Button>
      </div>
      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(data as any) ?? []} searchKey="name" searchPlaceholder="Search returns..." />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Tax Return</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label>Reference</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. VAT Q1 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Date From</Label><Input type="date" value={form.dateFrom} onChange={(e) => setForm({ ...form, dateFrom: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Date To</Label><Input type="date" value={form.dateTo} onChange={(e) => setForm({ ...form, dateTo: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate(form)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
