"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { DateRangeFilter } from "./report-filters";

export function TrialBalanceReport() {
  const [params, setParams] = useState<{ dateFrom: Date; dateTo: Date } | null>(null);

  const { data, isFetching } = trpc.finance.report.trialBalance.useQuery(
    { dateFrom: params!.dateFrom, dateTo: params!.dateTo },
    { enabled: !!params },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trial Balance</h1>
        <p className="text-muted-foreground">
          Opening, period, and closing balances for all accounts
        </p>
      </div>

      <DateRangeFilter
        onGenerate={(dateFrom, dateTo) => setParams({ dateFrom, dateTo })}
        isPending={isFetching}
      />

      {isFetching && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data && !isFetching && (
        <Card>
          <CardHeader>
            <CardTitle>
              {params!.dateFrom.toLocaleDateString()} — {params!.dateTo.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="w-64 align-bottom">
                    Account
                  </TableHead>
                  <TableHead colSpan={2} className="text-center border-b-0">
                    Opening
                  </TableHead>
                  <TableHead colSpan={2} className="text-center border-b-0">
                    Period
                  </TableHead>
                  <TableHead colSpan={2} className="text-center border-b-0">
                    Closing
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accounts.map((acc) => (
                  <TableRow key={acc.accountId}>
                    <TableCell>
                      {acc.code} — {acc.name}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(acc.openingDebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(acc.openingCredit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(acc.periodDebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(acc.periodCredit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(acc.closingDebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(acc.closingCredit)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals */}
                <TableRow className="border-t-2 bg-muted/30 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono",
                      Math.abs(data.totals.openingDebit - data.totals.openingCredit) > 0.01 && "text-red-600",
                    )}
                  >
                    {formatCurrency(data.totals.openingDebit)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono",
                      Math.abs(data.totals.openingDebit - data.totals.openingCredit) > 0.01 && "text-red-600",
                    )}
                  >
                    {formatCurrency(data.totals.openingCredit)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.totals.periodDebit)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.totals.periodCredit)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono",
                      Math.abs(data.totals.closingDebit - data.totals.closingCredit) > 0.01 && "text-red-600",
                    )}
                  >
                    {formatCurrency(data.totals.closingDebit)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono",
                      Math.abs(data.totals.closingDebit - data.totals.closingCredit) > 0.01 && "text-red-600",
                    )}
                  >
                    {formatCurrency(data.totals.closingCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
