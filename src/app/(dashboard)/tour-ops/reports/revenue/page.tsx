"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function RevenueAnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [groupBy, setGroupBy] = useState<"month" | "quarter">("month");

  const { data, isLoading } = trpc.tourOps.reports.revenueByPeriod.useQuery({ year, groupBy });
  const { data: statusData } = trpc.tourOps.reports.filesByStatus.useQuery();

  const totalRevenue = data?.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalMargin = data?.reduce((s, d) => s + d.margin, 0) ?? 0;
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Revenue Analytics</h1>
        <p className="text-sm text-muted-foreground">Revenue, cost and margin trends</p>
      </div>

      <div className="flex gap-3">
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "month" | "quarter")}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">By Month</SelectItem>
            <SelectItem value="quarter">By Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}` },
          { label: "Total Margin", value: `$${totalMargin.toLocaleString()}`, colored: true },
          { label: "Avg Margin %", value: `${avgMarginPct.toFixed(1)}%`, colored: true },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-xl font-bold ${item.colored ? "text-green-600" : ""}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Revenue vs Cost vs Margin</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !data?.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`]} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="margin" name="Margin" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      {data && data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Breakdown</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="py-2 text-left font-medium text-muted-foreground">Period</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Files</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Revenue</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Cost</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Margin</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row) => (
                  <tr key={row.period}>
                    <td className="py-2 font-medium">{row.period}</td>
                    <td className="py-2 text-right">{row.count}</td>
                    <td className="py-2 text-right">${row.revenue.toLocaleString()}</td>
                    <td className="py-2 text-right">${row.cost.toLocaleString()}</td>
                    <td className={`py-2 text-right ${row.margin >= 0 ? "text-green-600" : "text-red-600"}`}>${row.margin.toLocaleString()}</td>
                    <td className={`py-2 text-right ${row.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {row.revenue > 0 ? `${((row.margin / row.revenue) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
