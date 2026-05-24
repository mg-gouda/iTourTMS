"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MANIFEST_STATUS_LABELS, MANIFEST_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

const today = new Date();

export default function MaterializationReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(today, 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));

  const { data, isLoading } = trpc.nileCruises.reports.manifestReport.useQuery({ dateFrom, dateTo });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Materialization Report</h1>
        <p className="text-sm text-muted-foreground">Manifest submission status per departure</p>
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
          {data && <span className="ml-auto self-center text-sm text-muted-foreground">{data.length} manifests</span>}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <div className="py-12 text-center text-muted-foreground">No manifests found for the selected period</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Manifest</th>
                <th className="px-4 py-3 text-left font-medium">Departure</th>
                <th className="px-4 py-3 text-left font-medium">Boat</th>
                <th className="px-4 py-3 text-left font-medium">Embark</th>
                <th className="px-4 py-3 text-left font-medium">Disembark</th>
                <th className="px-4 py-3 text-left font-medium">Version</th>
                <th className="px-4 py-3 text-left font-medium">Submitted</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{m.submissionRef ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.departure.code}</td>
                  <td className="px-4 py-3">{m.departure.boat.name}</td>
                  <td className="px-4 py-3">{format(new Date(m.departure.embarkDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">{format(new Date(m.departure.disembarkDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">v{m.versionNumber}</td>
                  <td className="px-4 py-3">{m.submittedAt ? format(new Date(m.submittedAt), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={MANIFEST_STATUS_VARIANTS[m.status as keyof typeof MANIFEST_STATUS_VARIANTS] ?? "outline"} className="text-xs">
                      {MANIFEST_STATUS_LABELS[m.status as keyof typeof MANIFEST_STATUS_LABELS] ?? m.status}
                    </Badge>
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
