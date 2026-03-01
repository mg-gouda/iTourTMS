"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function RevenueByServicePage() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);

  const { data, isLoading } = trpc.traffic.reports.revenueByService.useQuery({ dateFrom: new Date(dateFrom), dateTo: new Date(dateTo) });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Revenue by Service Type</h1></div>
        <div className="flex items-center gap-3">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
      </div>
      {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
        <Card>
          <CardHeader><CardTitle>Revenue Summary</CardTitle></CardHeader>
          <CardContent>
            {data?.length === 0 ? <p className="py-8 text-center text-muted-foreground">No data for this period.</p> : (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-4 border-b pb-2 text-sm font-medium text-muted-foreground">
                  <span>Service Type</span><span>Jobs</span><span>Revenue</span><span>Cost</span><span>Margin</span>
                </div>
                {data?.map((d) => (
                  <div key={d.serviceType} className="grid grid-cols-5 gap-4 rounded-md border p-3 text-sm">
                    <span className="font-medium">{TT_SERVICE_TYPE_LABELS[d.serviceType] ?? d.serviceType}</span>
                    <span>{d.count}</span>
                    <span className="text-green-600">{d.revenue.toFixed(2)}</span>
                    <span className="text-red-600">{d.cost.toFixed(2)}</span>
                    <span className={d.margin >= 0 ? "text-green-600" : "text-red-600"}>{d.margin.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
