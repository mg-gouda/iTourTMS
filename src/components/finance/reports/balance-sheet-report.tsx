"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useShowBranch } from "@/hooks/use-branch-columns";
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
  /** Per-branch values for an account (or, with null, the section subtotal) when comparing. */
  split: (accountId: string | null) => Record<string, number> = () => ({}),
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
        values: { balance: acc.balance, ...split(acc.accountId) },
        drilldownHref: href,
      });
    }
  }

  rows.push({
    type: "subtotal",
    label: `Total ${sectionLabel}`,
    values: { balance: subtotal, ...split(null) },
  });

  return rows;
}

export function BalanceSheetReport() {
  const [asOfDate, setAsOfDate] = useState<Date | null>(null);

  const { data, isFetching } = trpc.finance.report.balanceSheet.useQuery(
    { asOfDate: asOfDate! },
    { enabled: !!asOfDate },
  );

  // Head office: one column per branch beside the consolidated figure.
  const showBranch = useShowBranch();
  const [compare, setCompare] = useState(false);
  const { data: byBranch, isFetching: fetchingBranches } = trpc.finance.branchReport.balanceSheet.useQuery(
    { asOfDate: asOfDate ?? new Date() },
    { enabled: !!asOfDate && compare && showBranch },
  );
  const comparing = compare && showBranch && !!byBranch;
  const shownColumns: ReportColumn[] = comparing
    ? [
        ...byBranch.map((c) => ({ key: c.branch.id, label: c.branch.code, align: "right" as const, format: "currency" as const })),
        { key: "balance", label: "Consolidated", align: "right", format: "currency" },
      ]
    : columns;
  type BS = NonNullable<typeof data>;
  const perBranch = (pick: (r: BS) => number | undefined): Record<string, number> =>
    comparing ? Object.fromEntries(byBranch.map((c) => [c.branch.id, pick(c.report) ?? 0])) : {};
  const sectionSplit =
    (section: "assets" | "liabilities" | "equity", total: "totalAssets" | "totalLiabilities" | "totalEquity") =>
    (accountId: string | null) =>
      perBranch((r) =>
        accountId === null
          ? r[total]
          : r[section].flatMap((g) => g.accounts).find((a) => a.accountId === accountId)?.balance,
      );

  function buildRows(): ReportRow[] {
    if (!data) return [];
    const dateStr = asOfDate!.toISOString().split("T")[0];
    const rows: ReportRow[] = [];

    rows.push(...buildSectionRows("Assets", data.assets, data.totalAssets, dateStr, sectionSplit("assets", "totalAssets")));
    rows.push(...buildSectionRows("Liabilities", data.liabilities, data.totalLiabilities, dateStr, sectionSplit("liabilities", "totalLiabilities")));
    rows.push(...buildSectionRows("Equity", data.equity, data.totalEquity, dateStr, sectionSplit("equity", "totalEquity")));

    rows.push({
      type: "total",
      label: "Liabilities + Equity",
      values: {
        balance: data.totalLiabilities + data.totalEquity,
        ...perBranch((r) => r.totalLiabilities + r.totalEquity),
      },
    });

    return rows;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Balance Sheet</h1>
          <p className="text-muted-foreground">
            Assets, liabilities, and equity as of a specific date
          </p>
        </div>
        <div className="flex items-center gap-4">
        {showBranch && (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={compare} onCheckedChange={setCompare} />
            Compare branches
          </label>
        )}
        {data && (
          <button
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            onClick={async () => {
              const { exportBalanceSheetToExcel } = await import("@/lib/export/finance-report-excel");
              const toRows = (groups: SectionGroup[]) =>
                groups.flatMap((g) => g.accounts.map((a) => ({ accountCode: a.code, accountName: a.name, accountType: g.accountTypeLabel, debit: 0, credit: 0, balance: Number(a.balance ?? 0) })));
              await exportBalanceSheetToExcel(toRows(data.assets ?? []), toRows(data.liabilities ?? []), toRows(data.equity ?? []), "USD");
            }}
          >
            Export Excel
          </button>
        )}
        </div>
      </div>

      <AsOfDateFilter
        onGenerate={(date) => setAsOfDate(date)}
        isPending={isFetching}
      />

      {(isFetching || (compare && fetchingBranches)) && (
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
            <ReportTable columns={shownColumns} rows={buildRows()} />

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
