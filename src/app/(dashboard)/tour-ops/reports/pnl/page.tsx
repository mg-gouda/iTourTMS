"use client";

import { useState } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { OPS_CLIENT_TYPE_LABELS, OPS_FILE_STATUS_LABELS } from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function PnLReportPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientType, setClientType] = useState("ALL");

  const { data, isLoading } = trpc.tourOps.reports.pnlSummary.useQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    clientType: clientType === "ALL" ? undefined : clientType,
  });

  const summary = data?.summary;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">P&L Reports</h1>
        <p className="text-sm text-muted-foreground">Profit & Loss per file</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Select value={clientType} onValueChange={setClientType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {(["B2C", "TOUR_OPERATOR", "TRAVEL_AGENT"] as const).map((t) => (
              <SelectItem key={t} value={t}>{OPS_CLIENT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Budgeted Revenue", value: summary.totalBudgetedRevenue },
            { label: "Budgeted Margin", value: summary.budgetedMargin, colored: true },
            { label: "Actual Revenue", value: summary.totalActualRevenue },
            { label: "Actual Margin", value: summary.actualMargin, colored: true },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-xl font-bold ${item.colored ? (item.value >= 0 ? "text-green-600" : "text-red-600") : ""}`}>
                  ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Files table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Files ({data?.files.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : !data?.files.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No confirmed files in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="py-2 text-left text-muted-foreground font-medium">Code</th>
                  <th className="py-2 text-left text-muted-foreground font-medium">Travel From</th>
                  <th className="py-2 text-left text-muted-foreground font-medium">Status</th>
                  <th className="py-2 text-right text-muted-foreground font-medium">Bud. Revenue</th>
                  <th className="py-2 text-right text-muted-foreground font-medium">Bud. Cost</th>
                  <th className="py-2 text-right text-muted-foreground font-medium">Bud. Margin</th>
                  <th className="py-2 text-right text-muted-foreground font-medium">Act. Margin</th>
                  <th className="py-2 text-right text-muted-foreground font-medium">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.files.map((file) => {
                  const budgMargin = Number(file.pnl?.budgetedRevenue ?? 0) - Number(file.pnl?.budgetedCost ?? 0);
                  const actMargin = Number(file.pnl?.actualRevenue ?? 0) - Number(file.pnl?.actualCost ?? 0);
                  const variance = Number(file.pnl?.variance ?? 0);
                  return (
                    <PermissionGuard permission="tour-ops:report:read">
                      <tr key={file.id} className="hover:bg-muted/30">
                      <td className="py-2 font-mono">{file.code}</td>
                      <td className="py-2">{format(new Date(file.travelFrom), "dd MMM yyyy")}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">
                          {OPS_FILE_STATUS_LABELS[file.status as keyof typeof OPS_FILE_STATUS_LABELS]}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">${Number(file.pnl?.budgetedRevenue ?? 0).toLocaleString()}</td>
                      <td className="py-2 text-right">${Number(file.pnl?.budgetedCost ?? 0).toLocaleString()}</td>
                      <td className={`py-2 text-right ${budgMargin >= 0 ? "text-green-600" : "text-red-600"}`}>${budgMargin.toLocaleString()}</td>
                      <td className={`py-2 text-right ${actMargin >= 0 ? "text-green-600" : "text-red-600"}`}>${actMargin.toLocaleString()}</td>
                      <td className={`py-2 text-right font-medium ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>${variance.toLocaleString()}</td>
                    </tr>
                    </PermissionGuard>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
