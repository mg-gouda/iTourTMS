"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const today = new Date();

export default function CancellationReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(today, 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));

  const { data, isLoading } = trpc.nileCruises.reports.cancellationReport.useQuery({ dateFrom, dateTo });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cancellation Report</h1>
        <p className="text-sm text-muted-foreground">Cancelled bookings and penalties</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-4 pt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Cancelled From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
          {data && <span className="ml-auto text-sm text-muted-foreground self-center">{data.length} cancellations</span>}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <div className="py-12 text-center text-muted-foreground">No cancellations in the selected period</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Booking</th>
                <th className="px-4 py-3 text-left font-medium">Guest</th>
                <th className="px-4 py-3 text-left font-medium">Departure</th>
                <th className="px-4 py-3 text-left font-medium">Boat</th>
                <th className="px-4 py-3 text-left font-medium">Embark</th>
                <th className="px-4 py-3 text-right font-medium">Gross Total</th>
                <th className="px-4 py-3 text-right font-medium">Penalty</th>
                <th className="px-4 py-3 text-left font-medium">Cancelled At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{b.code}</td>
                  <td className="px-4 py-3">{b.leadGuestName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.departure.code}</td>
                  <td className="px-4 py-3">{b.departure.boat.name}</td>
                  <td className="px-4 py-3">{format(new Date(b.departure.embarkDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(b.grossTotal).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive">
                    {b.cancellationPenalty ? Number(b.cancellationPenalty).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">{b.cancelledAt ? format(new Date(b.cancelledAt), "dd MMM yyyy") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
