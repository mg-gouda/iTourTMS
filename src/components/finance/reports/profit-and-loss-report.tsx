"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/finance";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";

import { DateRangeFilter } from "./report-filters";
import { ReportTable, type ReportColumn, type ReportRow } from "./report-table";

const columns: ReportColumn[] = [
  { key: "balance", label: "Balance", align: "right", format: "currency" },
];

export function ProfitAndLossReport() {
  const [params, setParams] = useState<{ dateFrom: Date; dateTo: Date } | null>(null);

  const { data, isFetching } = trpc.finance.report.profitAndLoss.useQuery(
    { dateFrom: params?.dateFrom ?? new Date(), dateTo: params?.dateTo ?? new Date() },
    { enabled: !!params },
  );

  function buildRows(): ReportRow[] {
    if (!data) return [];
    const rows: ReportRow[] = [];

    // Income section
    rows.push({ type: "section", label: "Income", values: {} });
    let currentType = "";
    for (const acc of data.incomeAccounts) {
      if (acc.accountType !== currentType) {
        currentType = acc.accountType;
        rows.push({
          type: "section",
          label: `  ${ACCOUNT_TYPE_LABELS[acc.accountType] ?? acc.accountType}`,
          values: {},
        });
      }
      rows.push({
        type: "data",
        label: `${acc.code} — ${acc.name}`,
        values: { balance: acc.balance },
        drilldownHref: `/finance/reports/general-ledger?accountId=${acc.accountId}&dateFrom=${params!.dateFrom.toISOString().split("T")[0]}&dateTo=${params!.dateTo.toISOString().split("T")[0]}`,
      });
    }
    rows.push({
      type: "subtotal",
      label: "Total Income",
      values: { balance: data.totalIncome },
    });

    // Expense section
    rows.push({ type: "section", label: "Expenses", values: {} });
    currentType = "";
    for (const acc of data.expenseAccounts) {
      if (acc.accountType !== currentType) {
        currentType = acc.accountType;
        rows.push({
          type: "section",
          label: `  ${ACCOUNT_TYPE_LABELS[acc.accountType] ?? acc.accountType}`,
          values: {},
        });
      }
      rows.push({
        type: "data",
        label: `${acc.code} — ${acc.name}`,
        values: { balance: acc.balance },
        drilldownHref: `/finance/reports/general-ledger?accountId=${acc.accountId}&dateFrom=${params!.dateFrom.toISOString().split("T")[0]}&dateTo=${params!.dateTo.toISOString().split("T")[0]}`,
      });
    }
    rows.push({
      type: "subtotal",
      label: "Total Expenses",
      values: { balance: data.totalExpenses },
    });

    // Net Profit
    rows.push({
      type: "total",
      label: "Net Profit",
      values: { balance: data.netProfit },
    });

    return rows;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profit & Loss</h1>
        <p className="text-muted-foreground">
          Income and expense summary for the selected period
        </p>
      </div>

      <DateRangeFilter
        onGenerate={(dateFrom, dateTo) => setParams({ dateFrom, dateTo })}
        isPending={isFetching}
      />

      {isFetching && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data && !isFetching && (
        <Card>
          <CardHeader>
            <CardTitle>
              {params!.dateFrom.toLocaleDateString()} — {params!.dateTo.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTable columns={columns} rows={buildRows()} />

            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Income</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(data.totalIncome)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenses</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(data.totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Net Profit</span>
                  <span className="font-mono">{formatCurrency(data.netProfit)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
