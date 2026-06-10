"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";
import { DateRangeFilter } from "./report-filters";
import { cn } from "@/lib/utils";

export function TaxReport() {
  const [range, setRange] = useState<{ dateFrom: Date; dateTo: Date } | null>(null);

  const { data, isFetching } = trpc.finance.report.taxReport.useQuery(
    { dateFrom: range?.dateFrom ?? new Date(), dateTo: range?.dateTo ?? new Date() },
    { enabled: !!range },
  );

  const sym = data?.baseCurrency?.symbol ?? "$";
  const fmt = (n: number) => `${sym} ${formatCurrency(n)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Report</h1>
        <p className="text-muted-foreground">Tax amounts collected and paid by tax code</p>
      </div>

      <DateRangeFilter onGenerate={(df, dt) => setRange({ dateFrom: df, dateTo: dt })} isPending={isFetching} />

      {isFetching && (
        <Card><CardContent className="pt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent></Card>
      )}

      {!isFetching && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              Period: {new Date(data.dateFrom).toLocaleDateString()} — {new Date(data.dateTo).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tax</th>
                  <th className="px-4 py-3 text-right font-medium">Rate</th>
                  <th className="px-4 py-3 text-right font-medium">Tax on Sales</th>
                  <th className="px-4 py-3 text-right font-medium">Tax on Purchases</th>
                  <th className="px-4 py-3 text-right font-medium">Net Tax Due</th>
                </tr>
              </thead>
              <tbody>
                {data.taxes.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No tax lines found for this period.</td></tr>
                )}
                {data.taxes.map((tax) => (
                  <tr key={tax.taxId} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{tax.taxName}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{tax.rate}%</td>
                    <td className="px-4 py-3 text-right">{fmt(tax.saleTaxAmount)}</td>
                    <td className="px-4 py-3 text-right">{fmt(tax.purchaseTaxAmount)}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold", tax.netTaxAmount < 0 && "text-red-600")}>
                      {fmt(tax.netTaxAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 bg-muted/30 font-semibold">
                <tr>
                  <td colSpan={2} className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{fmt(data.totals.saleTaxAmount)}</td>
                  <td className="px-4 py-3 text-right">{fmt(data.totals.purchaseTaxAmount)}</td>
                  <td className={cn("px-4 py-3 text-right font-bold", data.totals.netTaxAmount < 0 && "text-red-600")}>
                    {fmt(data.totals.netTaxAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
