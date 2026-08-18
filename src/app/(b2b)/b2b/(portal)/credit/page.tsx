"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  B2B_CREDIT_TX_TYPE_LABELS,
  B2B_CREDIT_TX_TYPE_VARIANTS,
} from "@/lib/constants/b2b-portal";
import { trpc } from "@/lib/trpc";

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * What the partner has spent and what is left, with the movements behind it
 * and a statement they can take to their own accounts department.
 */
export default function PartnerCreditPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const { data: summary, isLoading } = trpc.partner.credit.summary.useQuery();
  const { data: statement } = trpc.partner.credit.statement.useQuery({
    from: new Date(from),
    to: new Date(`${to}T23:59:59`),
  });

  const money = (n: number) =>
    `${summary?.currencyCode ? `${summary.currencyCode} ` : ""}${n.toLocaleString("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const usedPct =
    summary.creditLimit && summary.creditLimit > 0
      ? Math.min(100, Math.round((summary.creditUsed / summary.creditLimit) * 100))
      : null;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit &amp; statements</h1>
        <p className="text-muted-foreground">{summary.partnerName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credit limit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summary.creditLimit === null ? "No limit" : money(summary.creditLimit)}
            </p>
            {summary.paymentTermDays !== null && (
              <p className="text-muted-foreground text-xs">
                Payment terms: {summary.paymentTermDays} days
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{money(summary.creditUsed)}</p>
            {usedPct !== null && (
              <>
                <div className="bg-muted mt-2 h-1.5 w-full rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${usedPct >= 90 ? "bg-destructive" : usedPct >= 75 ? "bg-amber-500" : "bg-primary"}`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{usedPct}% of your limit</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summary.available === null ? "—" : money(summary.available)}
            </p>
            {usedPct !== null && usedPct >= 90 && (
              <p className="text-destructive text-xs">
                You are close to your limit. New bookings may need approval.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Statement</CardTitle>
            <p className="text-muted-foreground text-xs">
              Opening balance, everything that moved, closing balance.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" asChild>
              <a href={`/api/b2b/documents/statement?from=${from}&to=${to}`}>
                <Download className="mr-2 size-4" /> PDF
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Opening balance</p>
              <p className="font-medium">{money(statement?.openingBalance ?? 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Closing balance</p>
              <p className="font-medium">{money(statement?.closingBalance ?? 0)}</p>
            </div>
          </div>

          {!statement?.transactions.length ? (
            <p className="text-muted-foreground text-sm">Nothing moved in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-xs">
                  <tr>
                    <th className="p-2 text-left font-medium">Date</th>
                    <th className="p-2 text-left font-medium">Type</th>
                    <th className="p-2 text-left font-medium">Reference</th>
                    <th className="p-2 text-right font-medium">Amount</th>
                    <th className="p-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="p-2 whitespace-nowrap">{date(tx.createdAt)}</td>
                      <td className="p-2">
                        <Badge variant={B2B_CREDIT_TX_TYPE_VARIANTS[tx.type] ?? "secondary"}>
                          {B2B_CREDIT_TX_TYPE_LABELS[tx.type] ?? tx.type}
                        </Badge>
                      </td>
                      <td className="p-2">{tx.booking?.code ?? tx.reference ?? "—"}</td>
                      <td className="p-2 text-right">{money(Number(tx.amount))}</td>
                      <td className="p-2 text-right">{money(Number(tx.runningBalance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
