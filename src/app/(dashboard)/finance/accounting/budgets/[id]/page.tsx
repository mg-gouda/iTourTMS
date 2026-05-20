"use client";

import { Check, RotateCcw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BUDGET_STATE_LABELS,
  BUDGET_MONTH_LABELS,
  BUDGET_AMOUNT_KEYS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

const stateVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  APPROVED: "default",
  CANCELLED: "destructive",
};

function fmtAmount(val: any): string {
  return Number(val ?? 0).toFixed(2);
}

export default function BudgetDetailPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: budget, isLoading } =
    trpc.finance.budget.getById.useQuery({ id });

  const approveMutation = trpc.finance.budget.approve.useMutation({
    onSuccess: () => utils.finance.budget.getById.invalidate({ id }),
  });

  const cancelMutation = trpc.finance.budget.cancel.useMutation({
    onSuccess: () => utils.finance.budget.getById.invalidate({ id }),
  });

  const resetMutation = trpc.finance.budget.resetToDraft.useMutation({
    onSuccess: () => utils.finance.budget.getById.invalidate({ id }),
  });

  const deleteMutation = trpc.finance.budget.delete.useMutation({
    onSuccess: () => {
      utils.finance.budget.list.invalidate();
      router.push("/finance/accounting/budgets");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {tc("loading")}
      </div>
    );
  }
  if (!budget) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t("budgetNotFound")}
      </div>
    );
  }

  const isDraft = budget.state === "DRAFT";
  const isApproved = budget.state === "APPROVED";
  const isCancelled = budget.state === "CANCELLED";

  return (
    <PermissionGuard permission="finance:budget:read">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {budget.name}
            </h1>
            <Badge variant={stateVariant[budget.state] ?? "outline"}>
              {BUDGET_STATE_LABELS[budget.state] ?? budget.state}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("fiscalYears")}: {budget.fiscalYear?.name ?? "—"}
          </p>
        </div>

        <div className="flex gap-2">
          {isDraft && (
            <Button
              onClick={() => approveMutation.mutate({ id })}
              disabled={approveMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              {tc("approve")}
            </Button>
          )}
          {(isDraft || isApproved) && (
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate({ id })}
              disabled={cancelMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              {tc("cancel")}
            </Button>
          )}
          {isCancelled && (
            <Button
              variant="outline"
              onClick={() => resetMutation.mutate({ id })}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("resetToDraft")}
            </Button>
          )}
          {(isApproved || isDraft) && (
            <Button variant="outline" asChild>
              <Link href={`/finance/reports/budget-vs-actuals?budgetId=${id}`}>
                {t("viewReport")}
              </Link>
            </Button>
          )}
          {isDraft && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tc("delete")}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("budgetSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("totalLines")}</span>
              <p className="text-lg font-medium">{budget.lines.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("annualTotal")}</span>
              <p className="text-lg font-medium font-mono">
                {budget.lines
                  .reduce((s: number, l: any) => s + Number(l.annualAmount ?? 0), 0)
                  .toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("period")}</span>
              <p className="text-lg font-medium">
                {budget.fiscalYear
                  ? `${new Date(budget.fiscalYear.dateFrom).toLocaleDateString()} — ${new Date(budget.fiscalYear.dateTo).toLocaleDateString()}`
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Lines Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("budgetLines")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 min-w-[200px] bg-background">
                    {t("accountName")}
                  </TableHead>
                  {BUDGET_MONTH_LABELS.map((m) => (
                    <TableHead key={m} className="min-w-[90px] text-right">
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[100px] text-right font-semibold">
                    {t("annualTotal")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budget.lines.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="sticky left-0 z-10 bg-background">
                      {line.account
                        ? `${line.account.code} — ${line.account.name}`
                        : line.accountId}
                    </TableCell>
                    {BUDGET_AMOUNT_KEYS.map((key) => (
                      <TableCell key={key} className="text-right font-mono">
                        {fmtAmount(line[key])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono font-medium">
                      {fmtAmount(line.annualAmount)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="font-medium border-t-2">
                  <TableCell className="sticky left-0 z-10 bg-background">
                    {tc("total")}
                  </TableCell>
                  {BUDGET_AMOUNT_KEYS.map((key) => (
                    <TableCell key={key} className="text-right font-mono">
                      {budget.lines
                        .reduce(
                          (s: number, l: any) => s + Number(l[key] ?? 0),
                          0,
                        )
                        .toFixed(2)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-mono">
                    {budget.lines
                      .reduce(
                        (s: number, l: any) =>
                          s + Number(l.annualAmount ?? 0),
                        0,
                      )
                      .toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteBudget")}</DialogTitle>
            <DialogDescription>
              {tc("confirmDelete")} &quot;{budget.name}&quot;? {tc("confirmDeleteDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? tc("deleting") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  );
}
