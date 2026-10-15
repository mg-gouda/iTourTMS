"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/shared/permission-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { P } from "@/lib/constants/permissions";
import { trpc } from "@/lib/trpc";

const today = () => new Date().toISOString().split("T")[0];

/** Money moving between branches: two entries, one in each branch's books. */
export default function InterBranchTransferPage() {
  const { data: mine } = trpc.branch.mine.useQuery();
  const { data: journals } = trpc.finance.journal.list.useQuery();
  const { data: accounts } = trpc.finance.account.list.useQuery({ limit: 100 });
  const [form, setForm] = useState({
    fromBranchId: "",
    toBranchId: "",
    fromJournalId: "",
    toJournalId: "",
    interBranchAccountId: "",
    amount: "",
    date: today(),
    ref: "",
  });
  const [done, setDone] = useState<{ sentId: string; sentName: string | null; receivedId: string; receivedName: string | null } | null>(null);

  const transfer = trpc.finance.interBranch.transfer.useMutation({
    onSuccess: (r) => {
      setDone(r);
      setForm((f) => ({ ...f, amount: "", ref: "" }));
      toast.success("Transfer posted in both branches");
    },
    onError: (e) => toast.error(e.message),
  });

  const branches = (mine?.branches ?? []).map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }));
  // Cash and bank journals usable by a branch: its own, or shared ones.
  const journalsFor = (branchId: string) =>
    (journals ?? [])
      .filter((j) => (j.type === "BANK" || j.type === "CASH") && (!j.branchId || j.branchId === branchId))
      .map((j) => ({ value: j.id, label: `${j.name}${j.branchId ? "" : " — shared"}` }));
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const ready =
    form.fromBranchId &&
    form.toBranchId &&
    form.fromBranchId !== form.toBranchId &&
    form.fromJournalId &&
    form.toJournalId &&
    form.interBranchAccountId &&
    Number(form.amount) > 0;

  return (
    <PermissionGuard permission={P.FINANCE_MOVE_CREATE}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inter-branch transfer</h1>
          <p className="text-muted-foreground">
            Posts one entry in each branch through the inter-branch account, so both sets of books
            balance and the transfer cancels out when consolidated.
          </p>
        </div>

        {(mine?.branches.length ?? 0) < 2 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-sm">
              You need access to at least two branches to move money between them.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer</CardTitle>
              <CardDescription>Amount in the company&apos;s base currency.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  transfer.mutate({ ...form, amount: Number(form.amount), date: new Date(form.date), ref: form.ref || undefined });
                }}
              >
                <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
                  <fieldset className="grid gap-3">
                    <legend className="mb-1 text-sm font-medium">From</legend>
                    <Combobox options={branches} value={form.fromBranchId} onValueChange={(v) => setForm((f) => ({ ...f, fromBranchId: v, fromJournalId: "" }))} placeholder="Branch" />
                    <Combobox options={journalsFor(form.fromBranchId)} value={form.fromJournalId} onValueChange={set("fromJournalId")} placeholder="Paid out of (cash/bank)" />
                  </fieldset>
                  <ArrowRight className="text-muted-foreground mb-3 hidden size-5 sm:block rtl:rotate-180" aria-hidden />
                  <fieldset className="grid gap-3">
                    <legend className="mb-1 text-sm font-medium">To</legend>
                    <Combobox options={branches} value={form.toBranchId} onValueChange={(v) => setForm((f) => ({ ...f, toBranchId: v, toJournalId: "" }))} placeholder="Branch" />
                    <Combobox options={journalsFor(form.toBranchId)} value={form.toJournalId} onValueChange={set("toJournalId")} placeholder="Paid into (cash/bank)" />
                  </fieldset>
                </div>

                <div className="grid gap-1.5">
                  <Label>Inter-branch account</Label>
                  <Combobox
                    options={(accounts?.items ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                    value={form.interBranchAccountId}
                    onValueChange={set("interBranchAccountId")}
                    placeholder="e.g. 1990 Inter-branch current account"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ib-amount">Amount</Label>
                    <Input id="ib-amount" type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => set("amount")(e.target.value)} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ib-date">Date</Label>
                    <Input id="ib-date" type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ib-ref">Reference</Label>
                    <Input id="ib-ref" value={form.ref} placeholder="Float for Luxor" onChange={(e) => set("ref")(e.target.value)} />
                  </div>
                </div>

                {form.fromBranchId && form.fromBranchId === form.toBranchId && (
                  <p className="text-destructive text-sm">Pick two different branches.</p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-4">
                  {done && (
                    <p className="text-muted-foreground text-sm">
                      Posted{" "}
                      <Link className="text-primary underline" href={`/finance/accounting/journal-entries/${done.sentId}`}>{done.sentName}</Link>
                      {" and "}
                      <Link className="text-primary underline" href={`/finance/accounting/journal-entries/${done.receivedId}`}>{done.receivedName}</Link>
                    </p>
                  )}
                  <Button type="submit" disabled={!ready || transfer.isPending}>
                    {transfer.isPending ? "Posting…" : "Post transfer"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionGuard>
  );
}
