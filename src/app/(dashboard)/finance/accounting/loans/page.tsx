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
import { Combobox } from "@/components/ui/combobox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

const STATE_VARIANTS: Record<string, "default" | "outline" | "secondary"> = { DRAFT: "outline", OPEN: "default", CLOSED: "secondary" };

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
  const t = useTranslations("finance");
  const tc = useTranslations("common");

  const STATE_LABELS: Record<string, string> = {
    DRAFT: tc("draft"),
    OPEN: t("assetStateRunning"),
    CLOSED: t("assetStateClosed"),
  };
  const TYPE_LABELS: Record<string, string> = {
    RECEIVED: t("loanReceived"),
    GIVEN: t("loanGiven"),
  };

  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.loan.list.useQuery({});
  const { data: accounts } = trpc.finance.account.list.useQuery({});
  const createMut = trpc.finance.loan.create.useMutation({
    onSuccess: () => { utils.finance.loan.list.invalidate(); setOpen(false); toast.success(t("loanCreated")); },
  });
  const closeMut = trpc.finance.loan.close.useMutation({ onSuccess: () => { utils.finance.loan.list.invalidate(); toast.success(t("loanClosed")); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", loanType: "RECEIVED", accountId: "", amount: "", rate: "", termMonths: "12", startDate: new Date().toISOString().split("T")[0] });

  const columns: ColumnDef<LoanRow, unknown>[] = [
    { accessorKey: "name", header: t("loanName") },
    { id: "type", accessorFn: (r) => TYPE_LABELS[r.loanType] ?? r.loanType, header: t("loanType"), cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.loanType] ?? row.original.loanType}</Badge> },
    { id: "partner", accessorFn: (r) => r.partner?.name ?? "—", header: t("partner") },
    { id: "account", accessorFn: (r) => r.account.name, header: t("accountName"), cell: ({ row }) => <span><span className="font-mono text-muted-foreground mr-1">{row.original.account.code}</span>{row.original.account.name}</span> },
    { id: "amount", accessorFn: (r) => r.amount, header: ({ column }) => <DataTableColumnHeader column={column} title={tc("amount")} />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.amount).toFixed(2)}</span> },
    { id: "outstanding", accessorFn: (r) => r.outstanding, header: t("outstanding"), cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.original.outstanding).toFixed(2)}</span> },
    { id: "rate", accessorFn: (r) => r.rate, header: t("annualRate"), cell: ({ row }) => <span>{Number(row.original.rate).toFixed(2)}%</span> },
    { accessorKey: "termMonths", header: t("termMonths") },
    { id: "startDate", accessorFn: (r) => r.startDate, header: ({ column }) => <DataTableColumnHeader column={column} title={t("startDate")} />, cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString() },
    {
      accessorKey: "state",
      header: tc("status"),
      cell: ({ row }) => <Badge variant={STATE_VARIANTS[row.getValue("state") as string] ?? "outline"}>{STATE_LABELS[row.getValue("state") as string] ?? row.getValue("state")}</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/finance/accounting/loans/${row.original.id}`)}>{t("viewSchedule")}</DropdownMenuItem>
            {row.original.state === "OPEN" && <DropdownMenuItem onClick={() => closeMut.mutate({ id: row.original.id })}>{t("closeLoan")}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PermissionGuard permission="finance:asset:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("loansTitle")}</h1>
          <p className="text-muted-foreground">{t("loansDesc")}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />{t("newLoan")}</Button>
      </div>

      {isLoading ? <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div> : (
        <DataTable columns={columns} data={(data as any) ?? []} searchKey="name" searchPlaceholder={tc("search")} onRowClick={(row) => router.push(`/finance/accounting/loans/${row.id}`)} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("newLoan")}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label>{t("loanName")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>{t("loanType")}</Label>
              <Combobox
                options={[
                  { value: "RECEIVED", label: t("loanReceived") },
                  { value: "GIVEN", label: t("loanGiven") },
                ]}
                value={form.loanType}
                onValueChange={(v) => setForm({ ...form, loanType: v })}
              />
            </div>
            <div className="grid gap-1.5"><Label>{t("loanAccount")}</Label>
              <Combobox
                options={(accounts?.items ?? []).map((a: any) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                value={form.accountId}
                onValueChange={(v) => setForm({ ...form, accountId: v })}
                placeholder={tc("select")}
                searchPlaceholder={tc("search")}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5"><Label>{tc("amount")}</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>{t("annualRate")}</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>{t("termMonths")}</Label><Input type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label>{t("startDate")}</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate({ ...form, amount: Number(form.amount), rate: Number(form.rate), termMonths: Number(form.termMonths), loanType: form.loanType as any })}>{t("createGenerateSchedule")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  );
}
