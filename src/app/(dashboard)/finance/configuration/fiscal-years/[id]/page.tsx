"use client";

import { Lock, LockOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FISCAL_YEAR_STATE_LABELS,
  FISCAL_PERIOD_STATE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

function PeriodStateBadge({ state }: { state: string }) {
  const variant =
    state === "OPEN" ? "default" : state === "LOCKED" ? "secondary" : "outline";
  return (
    <Badge variant={variant}>
      {FISCAL_PERIOD_STATE_LABELS[state] ?? state}
    </Badge>
  );
}

export default function FiscalYearDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const utils = trpc.useUtils();

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [retainedEarningsAccountId, setRetainedEarningsAccountId] =
    useState("");
  const [closingJournalId, setClosingJournalId] = useState("");

  const { data: year, isLoading } = trpc.finance.period.getYear.useQuery({
    id,
  });

  // Fetch accounts and journals for the close dialog
  const { data: accountsData } = trpc.finance.account.list.useQuery(
    { limit: 1000 },
    { enabled: closeDialogOpen },
  );
  const accounts = (accountsData as any)?.items ?? accountsData ?? [];
  const equityAccounts = accounts.filter(
    (a: any) =>
      a.accountType === "EQUITY" || a.accountType === "EQUITY_UNAFFECTED",
  );

  const { data: journals } = trpc.finance.journal.list.useQuery(undefined, {
    enabled: closeDialogOpen,
  });
  const generalJournals = (journals ?? []).filter(
    (j: any) => j.type === "GENERAL",
  );

  const lockPeriodMutation = trpc.finance.period.lockPeriod.useMutation({
    onSuccess: () => utils.finance.period.getYear.invalidate({ id }),
  });

  const unlockPeriodMutation = trpc.finance.period.unlockPeriod.useMutation({
    onSuccess: () => utils.finance.period.getYear.invalidate({ id }),
  });

  const lockAllMutation = trpc.finance.period.lockAllPeriods.useMutation({
    onSuccess: () => utils.finance.period.getYear.invalidate({ id }),
  });

  const closeYearMutation = trpc.finance.period.closeYear.useMutation({
    onSuccess: () => {
      utils.finance.period.getYear.invalidate({ id });
      utils.finance.period.listYears.invalidate();
      setCloseDialogOpen(false);
    },
  });

  const reopenYearMutation = trpc.finance.period.reopenYear.useMutation({
    onSuccess: () => {
      utils.finance.period.getYear.invalidate({ id });
      utils.finance.period.listYears.invalidate();
    },
  });

  const deleteMutation = trpc.finance.period.deleteYear.useMutation({
    onSuccess: () => {
      utils.finance.period.listYears.invalidate();
      router.push("/finance/configuration/fiscal-years");
    },
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!year) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Fiscal year not found.
      </div>
    );
  }

  const isOpen = year.state === "OPEN";
  const isClosed = year.state === "CLOSED";
  const hasOpenPeriods = year.periods.some((p) => p.state === "OPEN");
  const allPeriodsLocked = year.periods.every(
    (p) => p.state === "LOCKED" || p.state === "CLOSED",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{year.name}</h1>
            <Badge variant={isOpen ? "default" : "secondary"}>
              {FISCAL_YEAR_STATE_LABELS[year.state] ?? year.state}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {new Date(year.dateFrom).toLocaleDateString()} —{" "}
            {new Date(year.dateTo).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-2">
          {isOpen && hasOpenPeriods && (
            <Button
              variant="outline"
              disabled={lockAllMutation.isPending}
              onClick={() => lockAllMutation.mutate({ fiscalYearId: id })}
            >
              <Lock className="mr-2 size-4" />
              {lockAllMutation.isPending
                ? "Locking..."
                : "Lock All Open Periods"}
            </Button>
          )}
          {isOpen && allPeriodsLocked && (
            <Button onClick={() => setCloseDialogOpen(true)}>
              Close Fiscal Year
            </Button>
          )}
          {isClosed && (
            <Button
              variant="outline"
              disabled={reopenYearMutation.isPending}
              onClick={() => reopenYearMutation.mutate({ id })}
            >
              {reopenYearMutation.isPending ? "Reopening..." : "Reopen Year"}
            </Button>
          )}
          {isOpen && (
            <Button
              variant="destructive"
              size="icon"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id })}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() =>
              router.push("/finance/configuration/fiscal-years")
            }
          >
            Back
          </Button>
        </div>
      </div>

      {/* Closing info */}
      {isClosed && year.closingMove && (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <span className="text-sm text-muted-foreground">
              Closed on{" "}
              {year.closedAt
                ? new Date(year.closedAt).toLocaleDateString()
                : "—"}{" "}
              by {year.closedByUser?.name ?? year.closedByUser?.email ?? "—"}
            </span>
            <Link
              href={`/finance/accounting/journal-entries/${year.closingMove.id}`}
              className="text-sm font-medium text-primary underline"
            >
              View Closing Entry ({year.closingMove.name})
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Periods</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-48">Date Range</TableHead>
                <TableHead className="w-24">State</TableHead>
                <TableHead className="w-40">Locked By</TableHead>
                <TableHead className="w-44">Locked At</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {year.periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-mono">{period.number}</TableCell>
                  <TableCell className="font-medium">{period.name}</TableCell>
                  <TableCell>
                    {new Date(period.dateFrom).toLocaleDateString()} —{" "}
                    {new Date(period.dateTo).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <PeriodStateBadge state={period.state} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {period.lockedByUser?.name ??
                      period.lockedByUser?.email ??
                      "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {period.lockedAt
                      ? new Date(period.lockedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {period.state === "OPEN" && isOpen && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={lockPeriodMutation.isPending}
                        onClick={() =>
                          lockPeriodMutation.mutate({
                            periodId: period.id,
                          })
                        }
                      >
                        <Lock className="mr-1 size-3" />
                        Lock
                      </Button>
                    )}
                    {period.state === "LOCKED" && isOpen && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={unlockPeriodMutation.isPending}
                        onClick={() =>
                          unlockPeriodMutation.mutate({
                            periodId: period.id,
                          })
                        }
                      >
                        <LockOpen className="mr-1 size-3" />
                        Unlock
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Close Year Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Fiscal Year</DialogTitle>
            <DialogDescription>
              This will create a closing journal entry that zeros out all P&L
              accounts and transfers the net to retained earnings. This action
              can be reversed by reopening the year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Retained Earnings Account</Label>
              <Select
                value={retainedEarningsAccountId}
                onValueChange={setRetainedEarningsAccountId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select equity account" />
                </SelectTrigger>
                <SelectContent>
                  {equityAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Closing Journal</Label>
              <Select
                value={closingJournalId}
                onValueChange={setClosingJournalId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select journal" />
                </SelectTrigger>
                <SelectContent>
                  {generalJournals.map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.code} — {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {closeYearMutation.error && (
            <p className="text-sm text-destructive">
              {closeYearMutation.error.message}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !retainedEarningsAccountId ||
                !closingJournalId ||
                closeYearMutation.isPending
              }
              onClick={() =>
                closeYearMutation.mutate({
                  fiscalYearId: id,
                  retainedEarningsAccountId,
                  journalId: closingJournalId,
                })
              }
            >
              {closeYearMutation.isPending
                ? "Closing..."
                : "Close Fiscal Year"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
