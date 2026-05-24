"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

export default function CabinUtilizationPage() {
  const { data, isLoading } = trpc.nileCruises.reports.contractUtilization.useQuery({});

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cabin Utilization</h1>
        <p className="text-sm text-muted-foreground">Allotment usage across contracts and departures</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <div className="py-12 text-center text-muted-foreground">No allotment data found</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Contract</th>
                <th className="px-4 py-3 text-left font-medium">Departure</th>
                <th className="px-4 py-3 text-left font-medium">Embark</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Allotted</th>
                <th className="px-4 py-3 text-right font-medium">Sold</th>
                <th className="px-4 py-3 text-right font-medium">Available</th>
                <th className="px-4 py-3 text-right font-medium">Utilization</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{row.contract.code}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.departure?.code ?? "—"}</td>
                  <td className="px-4 py-3">{row.departure ? format(new Date(row.departure.embarkDate), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3">{row.cabinCategory.name}</td>
                  <td className="px-4 py-3 text-right">{row.totalCabins}</td>
                  <td className="px-4 py-3 text-right">{row.soldCabins}</td>
                  <td className="px-4 py-3 text-right">{row.totalCabins - row.soldCabins}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${row.utilization >= 80 ? "text-green-600" : row.utilization >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                      {row.utilization}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{row.allocationBasis}</Badge>
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
