"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";

import { AsOfDateFilter } from "./report-filters";
import { ReportTable, type ReportColumn, type ReportRow } from "./report-table";

const columns: ReportColumn[] = [
  { key: "balance", label: "Balance", align: "right", format: "currency" },
];

interface SectionGroup {
  accountType: string;
  accountTypeLabel: string;
  accounts: Array<{ accountId: string; code: string; name: string; balance: number }>;
  subtotal: number;
}

function buildSectionRows(
  sectionLabel: string,
  groups: SectionGroup[],
  subtotal: number,
  asOfDate: string,
): ReportRow[] {
  const rows: ReportRow[] = [];
  rows.push({ type: "section", label: sectionLabel, values: {} });

  for (const group of groups) {
    rows.push({
      type: "section",
      label: `  ${group.accountTypeLabel}`,
      values: {},
    });
    for (const acc of group.accounts) {
      const href = acc.accountId === "__retained_earnings__"
        ? undefined
        : `/finance/reports/general-ledger?accountId=${acc.accountId}&dateTo=${asOfDate}`;
      rows.push({
        type: "data",
        label: `${acc.code} — ${acc.name}`,
        values: { balance: acc.balance },
        drilldownHref: href,
      });
    }
  }

  rows.push({
    type: "subtotal",
    label: `Total ${sectionLabel}`,
    values: { balance: subtotal },
  });

  return rows;
}

export function BalanceSheetReport() {
  const [asOfDate, setAsOfDate] = useState<Date | null>(null);

  const { data, isFetching } = trpc.finance.report.balanceSheet.useQuery(
    { asOfDate: asOfDate! },
    { enabled: !!asOfDate },
  );

  function buildRows(): ReportRow[] {
    if (!data) return [];
    const dateStr = asOfDate!.toISOString().split("T")[0];
    const rows: ReportRow[] = [];

    rows.push(...buildSectionRows("Assets", data.assets, data.totalAssets, dateStr));
    rows.push(...buildSectionRows("Liabilities", data.liabilities, data.totalLiabilities, dateStr));
    rows.push(...buildSectionRows("Equity", data.equity, data.totalEquity, dateStr));

    rows.push({
      type: "total",
      label: "Liabilities + Equity",
      values: { balance: data.totalLiabilities + data.totalEquity },
    });

    return rows;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Balance Sheet</h1>
        <p className="text-muted-foreground">
          Assets, liabilities, and equity as of a specific date
        </p>
      </div>

      <AsOfDateFilter
        onGenerate={(date) => setAsOfDate(date)}
        isPending={isFetching}
      />

      {isFetching && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data && !isFetching && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>As of {asOfDate!.toLocaleDateString()}</CardTitle>
              <Badge variant={data.isBalanced ? "default" : "destructive"}>
                {data.isBalanced ? "Balanced" : "Unbalanced"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ReportTable columns={columns} rows={buildRows()} />

            <div className="mt-6 flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Assets</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(data.totalAssets)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Liabilities</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(data.totalLiabilities)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Equity</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(data.totalEquity)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Liabilities + Equity</span>
                  <span className="font-mono">
                    {formatCurrency(data.totalLiabilities + data.totalEquity)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
