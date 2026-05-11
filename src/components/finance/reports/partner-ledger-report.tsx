"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";
import { DateRangeFilter } from "./report-filters";
import { cn } from "@/lib/utils";

const MOVE_TYPE_LABELS: Record<string, string> = {
  OUT_INVOICE: "Invoice",
  OUT_REFUND: "Credit Note",
  IN_INVOICE: "Bill",
  IN_REFUND: "Refund",
  ENTRY: "Entry",
};

export function PartnerLedgerReport() {
  const [range, setRange] = useState<{ dateFrom: Date; dateTo: Date } | null>(null);
  const [partnerId, setPartnerId] = useState("");

  const { data: partners } = trpc.finance.partner.listAll.useQuery();
  const { data, isFetching } = trpc.finance.report.partnerLedger.useQuery(
    { partnerId, dateFrom: range?.dateFrom, dateTo: range?.dateTo },
    { enabled: !!partnerId && !!range },
  );

  const sym = data?.baseCurrency?.symbol ?? "$";
  const fmt = (n: number) => `${sym} ${formatCurrency(n)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner Ledger</h1>
        <p className="text-muted-foreground">All journal entries for a specific partner</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Partner</label>
          <select
            className="flex h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
          >
            <option value="">Select partner...</option>
            {partners?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <DateRangeFilter onGenerate={(df, dt) => setRange({ dateFrom: df, dateTo: dt })} isPending={isFetching} />
      </div>

      {isFetching && (
        <Card><CardContent className="pt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
        </CardContent></Card>
      )}

      {!isFetching && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{data.partner.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{data.lines.length} entries</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Entry</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-left font-medium">Account</th>
                    <th className="px-4 py-2 text-left font-medium">Label</th>
                    <th className="px-4 py-2 text-right font-medium">Debit</th>
                    <th className="px-4 py-2 text-right font-medium">Credit</th>
                    <th className="px-4 py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-blue-50 dark:bg-blue-950/20">
                    <td colSpan={5} className="px-4 py-2 font-semibold">Opening Balance</td>
                    <td colSpan={2} />
                    <td className="px-4 py-2 text-right font-semibold">{fmt(data.openingBalance)}</td>
                  </tr>
                  {data.lines.map((line) => (
                    <tr key={line.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                        {new Date(line.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{line.moveName}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs">
                          {MOVE_TYPE_LABELS[line.moveType] ?? line.moveType}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{line.accountCode}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate">{line.label}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {line.debit > 0 ? fmt(line.debit) : ""}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {line.credit > 0 ? fmt(line.credit) : ""}
                      </td>
                      <td className={cn("px-4 py-2 text-right font-mono", line.balance < 0 && "text-red-600")}>
                        {fmt(line.balance)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td colSpan={5} className="px-4 py-2">Closing Balance</td>
                    <td className="px-4 py-2 text-right">{fmt(data.periodDebit)}</td>
                    <td className="px-4 py-2 text-right">{fmt(data.periodCredit)}</td>
                    <td className={cn("px-4 py-2 text-right font-bold", data.closingBalance < 0 && "text-red-600")}>
                      {fmt(data.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
