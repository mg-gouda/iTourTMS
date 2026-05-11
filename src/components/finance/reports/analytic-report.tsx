"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";
import { DateRangeFilter } from "./report-filters";
import { cn } from "@/lib/utils";

export function AnalyticReport() {
  const [range, setRange] = useState<{ dateFrom: Date; dateTo: Date } | null>(null);

  const { data, isFetching } = trpc.finance.report.analyticReport.useQuery(
    { dateFrom: range!.dateFrom, dateTo: range!.dateTo },
    { enabled: !!range },
  );

  const sym = data?.baseCurrency?.symbol ?? "$";
  const fmt = (n: number) => `${sym} ${formatCurrency(n)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytic Report</h1>
        <p className="text-muted-foreground">Profit & loss breakdown by journal</p>
      </div>

      <DateRangeFilter onGenerate={(df, dt) => setRange({ dateFrom: df, dateTo: dt })} isPending={isFetching} />

      {isFetching && (
        <Card><CardContent className="pt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent></Card>
      )}

      {!isFetching && data && (
        <>
          <Card>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.journals} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <XAxis dataKey="journalCode" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${sym}${formatCurrency(v, 0)}`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Journal</th>
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-right font-medium">Income</th>
                    <th className="px-4 py-3 text-right font-medium">Expenses</th>
                    <th className="px-4 py-3 text-right font-medium">Net</th>
                    <th className="px-4 py-3 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.journals.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No data for this period.</td></tr>
                  )}
                  {data.journals.map((j) => {
                    const margin = j.income > 0 ? ((j.netProfit / j.income) * 100) : 0;
                    return (
                      <tr key={j.journalId} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{j.journalName}</td>
                        <td className="px-4 py-2 font-mono text-muted-foreground text-xs">{j.journalCode}</td>
                        <td className="px-4 py-2 text-right">{fmt(j.income)}</td>
                        <td className="px-4 py-2 text-right">{fmt(j.expenses)}</td>
                        <td className={cn("px-4 py-2 text-right font-semibold", j.netProfit < 0 && "text-red-600")}>
                          {fmt(j.netProfit)}
                        </td>
                        <td className={cn("px-4 py-2 text-right", margin < 0 && "text-red-600")}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 bg-muted/30 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{fmt(data.totals.income)}</td>
                    <td className="px-4 py-3 text-right">{fmt(data.totals.expenses)}</td>
                    <td className={cn("px-4 py-3 text-right font-bold", data.totals.netProfit < 0 && "text-red-600")}>
                      {fmt(data.totals.netProfit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {data.totals.income > 0 ? ((data.totals.netProfit / data.totals.income) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
