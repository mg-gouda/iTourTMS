"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const today = new Date();

export default function SalesByBoatPage() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(today, 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));

  const { data, isLoading } = trpc.nileCruises.reports.revenueSummary.useQuery({ dateFrom, dateTo, groupBy: "boat" });

  const total = data?.reduce((s, r) => s + r.revenue, 0) ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Sales by Boat</h1>
        <p className="text-sm text-muted-foreground">Revenue breakdown per vessel</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-4 pt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <div className="py-12 text-center text-muted-foreground">No data for the selected period</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Boat</th>
                <th className="px-4 py-3 text-right font-medium">Bookings</th>
                <th className="px-4 py-3 text-right font-medium">Passengers</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
                <th className="px-4 py-3 text-right font-medium">Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.sort((a, b) => b.revenue - a.revenue).map((row) => (
                <tr key={row.key} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-right">{row.bookings}</td>
                  <td className="px-4 py-3 text-right">{row.pax}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{total > 0 ? Math.round((row.revenue / total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/50 font-semibold">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{data.reduce((s, r) => s + r.bookings, 0)}</td>
                <td className="px-4 py-3 text-right">{data.reduce((s, r) => s + r.pax, 0)}</td>
                <td className="px-4 py-3 text-right font-mono">{total.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
