"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Users, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";
import { DateRangeFilter } from "./report-filters";
import { cn } from "@/lib/utils";

function KpiCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-bold", positive === false && "text-red-600", positive === true && "text-green-600")}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function ExecutiveSummaryReport() {
  const [range, setRange] = useState<{ dateFrom: Date; dateTo: Date } | null>(null);

  const { data, isFetching } = trpc.finance.report.executiveSummary.useQuery(
    { dateFrom: range!.dateFrom, dateTo: range!.dateTo },
    { enabled: !!range },
  );

  const sym = data?.baseCurrency?.symbol ?? "$";
  const fmt = (n: number) => `${sym} ${formatCurrency(n)}`;
  const pct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Executive Summary</h1>
        <p className="text-muted-foreground">High-level financial performance overview</p>
      </div>

      <DateRangeFilter onGenerate={(df, dt) => setRange({ dateFrom: df, dateTo: dt })} isPending={isFetching} />

      {isFetching && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </>
      )}

      {!isFetching && data && (
        <>
          {/* KPI Row 1 — P&L */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Revenue" value={fmt(data.revenue)} positive={data.revenue > 0} />
            <KpiCard label="Expenses" value={fmt(data.expenses)} positive={false} />
            <KpiCard label="Gross Profit" value={fmt(data.grossProfit)} positive={data.grossProfit > 0} />
            <KpiCard label="Gross Margin" value={pct(data.grossMarginPct)} sub="Revenue − Expenses / Revenue" positive={data.grossMarginPct > 0} />
          </div>

          {/* KPI Row 2 — Balance */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label="Cash Position" value={fmt(data.cashPosition)} positive={data.cashPosition > 0} />
            <KpiCard label="Accounts Receivable" value={fmt(data.totalReceivable)} sub="Outstanding customer invoices" />
            <KpiCard label="Accounts Payable" value={fmt(data.totalPayable)} sub="Outstanding vendor bills" />
          </div>

          {/* Revenue vs Expense trend */}
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue vs Expenses Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${sym}${formatCurrency(v, 0)}`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" fill="url(#gradRevenue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#gradExpenses)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top customers */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="size-4" />Top Customers by Revenue</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">#</th>
                      <th className="px-4 py-2 text-left font-medium">Customer</th>
                      <th className="px-4 py-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No data</td></tr>
                    )}
                    {data.topCustomers.map((c, i) => (
                      <tr key={c.partnerId ?? i} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{c.partnerName}</td>
                        <td className="px-4 py-2 text-right font-semibold">{fmt(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Top expenses */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="size-4" />Top Expense Accounts</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">#</th>
                      <th className="px-4 py-2 text-left font-medium">Account</th>
                      <th className="px-4 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topExpenses.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No data</td></tr>
                    )}
                    {data.topExpenses.map((e, i) => (
                      <tr key={e.accountId} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{e.accountName}</td>
                        <td className="px-4 py-2 text-right font-semibold text-red-600">{fmt(e.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
