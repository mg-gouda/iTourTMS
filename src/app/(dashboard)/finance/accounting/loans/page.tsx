"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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

const STATE_VARIANTS: Record<string, "default" | "outline" | "secondary"> = { DRAFT: "outline", OPEN: "default", CLOSED: "secondary" };
const STATE_LABELS: Record<string, string> = { DRAFT: "Draft", OPEN: "Running", CLOSED: "Closed" };
const TYPE_LABELS: Record<string, string> = { RECEIVED: "Loan Received", GIVEN: "Loan Given" };

type LoanRow = {
  id: string;
  name: string;
  loanType: string;
  state: string;
  amount: string;
  outstanding: string;
  rate: string;
  termMonths: number;
  startDate: string;
  partner: { name: string } | null;
  account: { code: string; name: string };
};

export default function LoansPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.loan.list.useQuery({});
  const { data: accounts } = trpc.finance.account.list.useQuery({});
  const createMut = trpc.finance.loan.create.useMutation({
    onSuccess: () => { utils.finance.loan.list.invalidate(); setOpen(false); toast.success("Loan created"); },
  });
  const closeMut = trpc.finance.loan.close.useMutation({ onSuccess: () => { utils.finance.loan.list.invalidate(); toast.success("Loan closed"); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", loanType: "RECEIVED", accountId: "", amount: "", rate: "", termMonths: "12", startDate: new Date().toISOString().split("T")[0] });

  const columns: ColumnDef<LoanRow, unknown>[] = [
    { accessorKey: "name", header: "Loan Name" },
    { id: "type", accessorFn: (r) => TYPE_LABELS[r.loanType] ?? r.loanType, header: "Type", cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.loanType]}</Badge> },
    { id: "partner", accessorFn: (r) => r.partner?.name ?? "—", header: "Partner" },
    { id: "account", accessorFn: (r) => r.account.name, header: "Account", cell: ({ row }) => <span><span className="font-mono text-muted-foreground mr-1">{row.original.account.code}</span>{row.original.account.name}</span> },
    { id: "amount", accessorFn: (r) => r.amount, header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.amount).toFixed(2)}</span> },
    { id: "outstanding", accessorFn: (r) => r.outstanding, header: "Outstanding", cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.outstanding).toFixed(2)}</span> },
    { id: "rate", accessorFn: (r) => r.rate, header: "Rate %", cell: ({ row }) => <span>{Number(row.original.rate).toFixed(2)}%</span> },
    { accessorKey: "termMonths", header: "Term (mo.)" },
    { id: "startDate", accessorFn: (r) => r.startDate, header: ({ column }) => <DataTableColumnHeader column={column} title="Start Date" />, cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString() },
    {
      accessorKey: "state",
      header: "Status",
      cell: ({ row }) => <Badge variant={STATE_VARIANTS[row.getValue("state") as string] ?? "outline"}>{STATE_LABELS[row.getValue("state") as string] ?? row.getValue("state")}</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/finance/accounting/loans/${row.original.id}`)}>View Schedule</DropdownMenuItem>
            {row.original.state === "OPEN" && <DropdownMenuItem onClick={() => closeMut.mutate({ id: row.original.id })}>Close Loan</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">Loan and amortization schedules.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />New Loan</Button>
      </div>

      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(data as any) ?? []} searchKey="name" searchPlaceholder="Search loans..." onRowClick={(row) => router.push(`/finance/accounting/loans/${row.id}`)} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label>Loan Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Type</Label>
              <Select value={form.loanType} onValueChange={(v) => setForm({ ...form, loanType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVED">Loan Received</SelectItem>
                  <SelectItem value="GIVEN">Loan Given</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Liability / Asset Account</Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{(accounts?.items ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5"><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Annual Rate %</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Term (months)</Label><Input type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate({ ...form, amount: Number(form.amount), rate: Number(form.rate), termMonths: Number(form.termMonths), loanType: form.loanType as any })}>Create & Generate Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
