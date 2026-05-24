"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const today = new Date();

export default function OccupancyReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(today, 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));

  const { data, isLoading } = trpc.nileCruises.reports.occupancySummary.useQuery({ dateFrom, dateTo });

  const avgOccupancy = data?.length
    ? Math.round(data.reduce((s, d) => s + d.occupancyRate, 0) / data.length)
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Occupancy Report</h1>
        <p className="text-sm text-muted-foreground">Cabin utilization per departure</p>
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
              <span className="font-medium">Avg occupancy: {avgOccupancy}%</span>
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
                <th className="px-4 py-3 text-left font-medium">Embark</th>
                <th className="px-4 py-3 text-left font-medium">Disembark</th>
                <th className="px-4 py-3 text-right font-medium">Bookings</th>
                <th className="px-4 py-3 text-right font-medium">Pax</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
                <th className="px-4 py-3 text-right font-medium">Occupancy</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((dep) => (
                <tr key={dep.departureId} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{dep.code}</td>
                  <td className="px-4 py-3">{dep.boat.name}</td>
                  <td className="px-4 py-3">{format(new Date(dep.embarkDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">{format(new Date(dep.disembarkDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 text-right">{dep.confirmedBookings}</td>
                  <td className="px-4 py-3 text-right">{dep.totalPax}</td>
                  <td className="px-4 py-3 text-right">{dep.totalRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${dep.occupancyRate >= 80 ? "text-green-600" : dep.occupancyRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                      {dep.occupancyRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{dep.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
