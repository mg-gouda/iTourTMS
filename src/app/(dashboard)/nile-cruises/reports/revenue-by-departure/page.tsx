"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const today = new Date();

export default function RevenueByDeparturePage() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(today, 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));

  const { data, isLoading } = trpc.nileCruises.reports.occupancySummary.useQuery({ dateFrom, dateTo });

  const grandTotal = data?.reduce((s, d) => s + d.totalRevenue, 0) ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Revenue by Departure</h1>
        <p className="text-sm text-muted-foreground">Revenue breakdown per cruise departure</p>
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
          {data && (
            <div className="ml-auto flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{data.length} departures</span>
              <span className="font-semibold">Total: {grandTotal.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <div className="py-12 text-center text-muted-foreground">No departures found for the selected period</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Departure</th>
                <th className="px-4 py-3 text-left font-medium">Boat</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Embark</th>
                <th className="px-4 py-3 text-left font-medium">Disembark</th>
                <th className="px-4 py-3 text-right font-medium">Bookings</th>
                <th className="px-4 py-3 text-right font-medium">Pax</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
                <th className="px-4 py-3 text-right font-medium">Rev/Pax</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((dep) => (
                <tr key={dep.departureId} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{dep.code}</td>
                  <td className="px-4 py-3">{dep.boat.name}</td>
                  <td className="px-4 py-3">{dep.cruiseType.name}</td>
                  <td className="px-4 py-3">{format(new Date(dep.embarkDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">{format(new Date(dep.disembarkDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 text-right">{dep.confirmedBookings}</td>
                  <td className="px-4 py-3 text-right">{dep.totalPax}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{dep.totalRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{dep.totalPax > 0 ? Math.round(dep.totalRevenue / dep.totalPax).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{dep.status}</Badge></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/50 font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={7}>Total</td>
                <td className="px-4 py-3 text-right font-mono">{grandTotal.toLocaleString()}</td>
                <td className="px-4 py-3" colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
