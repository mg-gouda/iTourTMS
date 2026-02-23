"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { BUDGET_MONTH_LABELS } from "@/lib/constants/finance";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

function fmt(val: number): string {
  return val.toFixed(2);
}

function varianceColor(variance: number): string {
  if (variance > 0.01) return "text-green-600 dark:text-green-400";
  if (variance < -0.01) return "text-red-600 dark:text-red-400";
  return "";
}

export default function BudgetVsActualsPage() {
  const searchParams = useSearchParams();
  const initialBudgetId = searchParams.get("budgetId") ?? "";
  const [budgetId, setBudgetId] = useState(initialBudgetId);

  const { data: budgets } = trpc.finance.budget.list.useQuery();
  const { data: report, isLoading } =
    trpc.finance.budget.budgetVsActuals.useQuery(
      { budgetId },
      { enabled: !!budgetId },
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Budget vs Actuals
        </h1>
        <p className="text-sm text-muted-foreground">
          Compare budgeted amounts against actual posted amounts
        </p>
      </div>

      {/* Budget Selector */}
      <div className="max-w-sm">
        <Select value={budgetId} onValueChange={setBudgetId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a budget" />
          </SelectTrigger>
          <SelectContent>
            {budgets?.map((b: any) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} ({b.fiscalYear?.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!budgetId && (
        <div className="text-center py-12 text-muted-foreground">
          Select a budget to view the report
        </div>
      )}

      {budgetId && isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading report...
        </div>
      )}

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {report.budgetName} — {report.fiscalYearName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        rowSpan={2}
                        className="sticky left-0 z-10 min-w-[200px] bg-background align-bottom"
                      >
                        Account
                      </TableHead>
                      {BUDGET_MONTH_LABELS.map((m) => (
                        <TableHead
                          key={m}
                          colSpan={3}
                          className="text-center border-l"
                        >
                          {m}
                        </TableHead>
                      ))}
                      <TableHead
                        colSpan={3}
                        className="text-center border-l font-semibold"
                      >
                        Annual
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      {[...BUDGET_MONTH_LABELS, "Total"].map((m) => (
                        <SubHeaders key={m} />
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.accounts.map((acc) => (
                      <TableRow key={acc.accountId}>
                        <TableCell className="sticky left-0 z-10 bg-background whitespace-nowrap">
                          {acc.accountCode} — {acc.accountName}
                        </TableCell>
                        {acc.planned.map((p, i) => (
                          <MonthCells
                            key={i}
                            planned={p}
                            actual={acc.actual[i]}
                            variance={acc.variance[i]}
                          />
                        ))}
                        <MonthCells
                          planned={acc.plannedTotal}
                          actual={acc.actualTotal}
                          variance={acc.varianceTotal}
                        />
                      </TableRow>
                    ))}
                    {/* Totals */}
                    <TableRow className="font-semibold border-t-2">
                      <TableCell className="sticky left-0 z-10 bg-background">
                        Total
                      </TableCell>
                      {report.totals.planned.map((p, i) => (
                        <MonthCells
                          key={i}
                          planned={p}
                          actual={report.totals.actual[i]}
                          variance={report.totals.variance[i]}
                        />
                      ))}
                      <MonthCells
                        planned={report.totals.plannedTotal}
                        actual={report.totals.actualTotal}
                        variance={report.totals.varianceTotal}
                      />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SubHeaders() {
  return (
    <>
      <TableHead className="text-right border-l text-xs">Plan</TableHead>
      <TableHead className="text-right text-xs">Actual</TableHead>
      <TableHead className="text-right text-xs">Var</TableHead>
    </>
  );
}

function MonthCells({
  planned,
  actual,
  variance,
}: {
  planned: number;
  actual: number;
  variance: number;
}) {
  return (
    <>
      <TableCell className="text-right font-mono border-l">
        {fmt(planned)}
      </TableCell>
      <TableCell className="text-right font-mono">{fmt(actual)}</TableCell>
      <TableCell className={cn("text-right font-mono", varianceColor(variance))}>
        {fmt(variance)}
      </TableCell>
    </>
  );
}
