"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";
import { DateRangeFilter } from "./report-filters";
import { cn } from "@/lib/utils";

interface CashFlowRow {
  label: string;
  amount: number;
  type: "item" | "section" | "subtotal" | "total";
  indent?: boolean;
}

export function CashFlowReport() {
  const [range, setRange] = useState<{ dateFrom: Date; dateTo: Date } | null>(null);

  const { data, isFetching } = trpc.finance.report.cashFlow.useQuery(
    { dateFrom: range!.dateFrom, dateTo: range!.dateTo },
    { enabled: !!range },
  );

  const sym = data?.baseCurrency?.symbol ?? "$";
  const fmt = (n: number) => `${sym} ${formatCurrency(n)}`;

  function buildRows(): CashFlowRow[] {
    if (!data) return [];
    const rows: CashFlowRow[] = [];

    rows.push({ label: "Operating Activities", amount: 0, type: "section" });
    rows.push({ label: "Net Income", amount: data.operating.netIncome, type: "item", indent: true });
    rows.push({ label: "Depreciation & Amortization", amount: data.operating.depreciation, type: "item", indent: true });
    rows.push({ label: "Changes in Working Capital", amount: 0, type: "section" });
    rows.push({ label: "Change in Trade Receivables", amount: data.operating.changeInReceivables, type: "item", indent: true });
    rows.push({ label: "Change in Current Assets", amount: data.operating.changeInCurrentAssets, type: "item", indent: true });
    rows.push({ label: "Change in Prepayments", amount: data.operating.changeInPrepayments, type: "item", indent: true });
    rows.push({ label: "Change in Trade Payables", amount: data.operating.changeInPayables, type: "item", indent: true });
    rows.push({ label: "Change in Current Liabilities", amount: data.operating.changeInCurrentLiabilities, type: "item", indent: true });
    rows.push({ label: "Net Cash from Operating Activities", amount: data.operating.total, type: "subtotal" });

    rows.push({ label: "Investing Activities", amount: 0, type: "section" });
    rows.push({ label: "Change in Fixed Assets", amount: data.investing.changeInFixedAssets, type: "item", indent: true });
    rows.push({ label: "Change in Non-Current Assets", amount: data.investing.changeInNonCurrentAssets, type: "item", indent: true });
    rows.push({ label: "Net Cash from Investing Activities", amount: data.investing.total, type: "subtotal" });

    rows.push({ label: "Financing Activities", amount: 0, type: "section" });
    rows.push({ label: "Change in Long-Term Debt", amount: data.financing.changeInNonCurrentLiabilities, type: "item", indent: true });
    rows.push({ label: "Change in Equity", amount: data.financing.changeInEquity, type: "item", indent: true });
    rows.push({ label: "Net Cash from Financing Activities", amount: data.financing.total, type: "subtotal" });

    rows.push({ label: "Net Change in Cash", amount: data.netCashChange, type: "total" });
    rows.push({ label: "Opening Cash Balance", amount: data.openingCash, type: "item" });
    rows.push({ label: "Closing Cash Balance", amount: data.closingCash, type: "total" });

    return rows;
  }

  const rows = buildRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
        <p className="text-muted-foreground">Indirect method — operating, investing, and financing activities</p>
      </div>

      <DateRangeFilter onGenerate={(df, dt) => setRange({ dateFrom: df, dateTo: dt })} isPending={isFetching} />

      {isFetching && (
        <Card><CardContent className="pt-6 space-y-3">
          {Array.from({ length: 14 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
        </CardContent></Card>
      )}

      {!isFetching && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              For the period {new Date(data.dateFrom).toLocaleDateString()} — {new Date(data.dateTo).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row, i) => {
                  const isSection = row.type === "section";
                  const isSubtotal = row.type === "subtotal";
                  const isTotal = row.type === "total";
                  return (
                    <tr
                      key={i}
                      className={cn(
                        "border-b",
                        isSection && "bg-muted/50",
                        isTotal && "bg-muted/30 border-t-2",
                        isSubtotal && "border-t",
                      )}
                    >
                      <td className={cn(
                        "px-6 py-2",
                        (isSection || isSubtotal || isTotal) && "font-semibold",
                        row.indent && "pl-10",
                      )}>
                        {row.label}
                      </td>
                      <td className={cn(
                        "px-6 py-2 text-right w-44 font-mono",
                        isSection && "invisible",
                        isTotal && "font-bold",
                        isSubtotal && "font-semibold",
                        row.amount < 0 && "text-red-600",
                      )}>
                        {!isSection ? fmt(row.amount) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
