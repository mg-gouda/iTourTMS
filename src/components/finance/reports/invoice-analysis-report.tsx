"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";
import { DateRangeFilter } from "./report-filters";
import { cn } from "@/lib/utils";

const PAYMENT_STATE_LABELS: Record<string, { label: string; class: string }> = {
  NOT_PAID: { label: "Unpaid", class: "text-red-700 bg-red-50 border-red-200" },
  PARTIAL: { label: "Partial", class: "text-amber-700 bg-amber-50 border-amber-200" },
  IN_PAYMENT: { label: "In Payment", class: "text-blue-700 bg-blue-50 border-blue-200" },
  PAID: { label: "Paid", class: "text-green-700 bg-green-50 border-green-200" },
  REVERSED: { label: "Reversed", class: "text-gray-700 bg-gray-50 border-gray-200" },
};

export function InvoiceAnalysisReport() {
  const [range, setRange] = useState<{ dateFrom: Date; dateTo: Date } | null>(null);
  const [moveType, setMoveType] = useState<"OUT_INVOICE" | "IN_INVOICE" | "ALL">("OUT_INVOICE");

  const { data, isFetching } = trpc.finance.report.invoiceAnalysis.useQuery(
    { dateFrom: range!.dateFrom, dateTo: range!.dateTo, moveType },
    { enabled: !!range },
  );

  const sym = data?.baseCurrency?.symbol ?? "$";
  const fmt = (n: number) => `${sym} ${formatCurrency(n)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoice Analysis</h1>
        <p className="text-muted-foreground">Invoice trends, partner breakdown, and payment performance</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Type</label>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={moveType}
            onChange={(e) => setMoveType(e.target.value as any)}
          >
            <option value="OUT_INVOICE">Customer Invoices</option>
            <option value="IN_INVOICE">Vendor Bills</option>
            <option value="ALL">All</option>
          </select>
        </div>
        <DateRangeFilter onGenerate={(df, dt) => setRange({ dateFrom: df, dateTo: dt })} isPending={isFetching} />
      </div>

      {isFetching && (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      )}

      {!isFetching && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Invoiced", value: fmt(data.totalAmount) },
              { label: "Outstanding", value: fmt(data.totalOutstanding) },
              { label: "Invoice Count", value: data.count.toString() },
              { label: "Avg. Amount", value: fmt(data.avgAmount) },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-muted-foreground">{kpi.label}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-xl font-bold">{kpi.value}</p></CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly trend */}
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.byMonth}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${sym}${formatCurrency(v, 0)}`} />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Bar dataKey="total" name="Amount" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By status */}
            <Card>
              <CardHeader><CardTitle className="text-base">By Payment Status</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="pb-2 text-left font-medium">Status</th>
                      <th className="pb-2 text-right font-medium">Count</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byStatus.map((row) => {
                      const meta = PAYMENT_STATE_LABELS[row.status];
                      return (
                        <tr key={row.status} className="border-b last:border-0">
                          <td className="py-2">
                            <Badge variant="outline" className={cn("text-xs", meta?.class)}>
                              {meta?.label ?? row.status}
                            </Badge>
                          </td>
                          <td className="py-2 text-right">{row.count}</td>
                          <td className="py-2 text-right">{fmt(row.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Top partners */}
          <Card>
            <CardHeader><CardTitle className="text-base">Top Partners</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Partner</th>
                    <th className="px-4 py-3 text-right font-medium">Invoices</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byPartner.map((p, i) => (
                    <tr key={p.partnerId} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">{p.partnerName}</td>
                      <td className="px-4 py-2 text-right">{p.count}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
