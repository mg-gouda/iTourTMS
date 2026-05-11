"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FiscalReport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isFetching } = trpc.finance.report.fiscalReport.useQuery({ year });

  const sym = data?.baseCurrency?.symbol ?? "$";
  const fmt = (n: number) => `${sym} ${formatCurrency(n)}`;

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fiscal Report</h1>
          <p className="text-muted-foreground">Monthly P&L breakdown for a fiscal year</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Fiscal Year</label>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {isFetching && (
        <Card><CardContent className="pt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      )}

      {!isFetching && data && (
        <>
          <Card>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.months} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${sym}${formatCurrency(v, 0)}`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="netProfit" name="Net Profit" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Month</th>
                    <th className="px-4 py-3 text-right font-medium">Income</th>
                    <th className="px-4 py-3 text-right font-medium">Expenses</th>
                    <th className="px-4 py-3 text-right font-medium">Net Profit</th>
                    <th className="px-4 py-3 text-right font-medium">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => {
                    const margin = m.income > 0 ? ((m.netProfit / m.income) * 100) : 0;
                    return (
                      <tr key={m.month} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{m.label} {year}</td>
                        <td className="px-4 py-2 text-right">{fmt(m.income)}</td>
                        <td className="px-4 py-2 text-right">{fmt(m.expenses)}</td>
                        <td className={cn("px-4 py-2 text-right font-semibold", m.netProfit < 0 && "text-red-600")}>
                          {fmt(m.netProfit)}
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
                    <td className="px-4 py-3">Total {year}</td>
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
