"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";

export function Report1099() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [threshold, setThreshold] = useState(600);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("");

  const { data, isFetching, refetch } = trpc.finance.report.report1099.useQuery(
    { year, threshold },
    { enabled: false },
  );

  const sym = data?.baseCurrency?.symbol ?? "$";
  const fmt = (n: number) => `${sym} ${formatCurrency(n)}`;

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const vendors = data?.vendors
    .filter((v) => showAll || v.reportable)
    .filter((v) => !filter || v.partnerName.toLowerCase().includes(filter.toLowerCase())) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">1099 Report</h1>
        <p className="text-muted-foreground">Vendors paid above the reporting threshold for a calendar year</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Year</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Threshold ({sym})</Label>
          <Input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-28"
          />
        </div>
        <Button onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Loading..." : "Generate"}
        </Button>
      </div>

      {isFetching && (
        <Card><CardContent className="pt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent></Card>
      )}

      {!isFetching && data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Reportable Vendors</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{data.reportableCount}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total Reportable Payments</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{fmt(data.reportableTotal)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total Vendors</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{data.vendors.length}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Vendor Payments — {data.year}</CardTitle>
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Filter by name..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-48 h-8"
                  />
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                    Show all vendors
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Vendor</th>
                    <th className="px-4 py-3 text-left font-medium">Tax ID</th>
                    <th className="px-4 py-3 text-right font-medium">Invoices</th>
                    <th className="px-4 py-3 text-right font-medium">Total Paid</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No vendors found.</td></tr>
                  )}
                  {vendors.map((v) => (
                    <tr key={v.partnerId} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{v.partnerName}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{v.taxId ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{v.invoiceCount}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(v.total)}</td>
                      <td className="px-4 py-3 text-center">
                        {v.reportable ? (
                          <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200">
                            <AlertCircle className="size-3" /> Reportable
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <CheckCircle className="size-3" /> Below threshold
                          </Badge>
                        )}
                      </td>
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
