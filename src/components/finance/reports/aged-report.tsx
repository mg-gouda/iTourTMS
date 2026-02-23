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

import { AsOfDateFilter } from "./report-filters";

interface AgedReportProps {
  reportType: "receivable" | "payable";
}

export function AgedReport({ reportType }: AgedReportProps) {
  const [asOfDate, setAsOfDate] = useState<Date | null>(null);

  const receivableQuery = trpc.finance.report.agedReceivable.useQuery(
    { asOfDate: asOfDate! },
    { enabled: reportType === "receivable" && !!asOfDate },
  );

  const payableQuery = trpc.finance.report.agedPayable.useQuery(
    { asOfDate: asOfDate! },
    { enabled: reportType === "payable" && !!asOfDate },
  );

  const query = reportType === "receivable" ? receivableQuery : payableQuery;

  const title =
    reportType === "receivable" ? "Aged Receivable" : "Aged Payable";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          {reportType === "receivable"
            ? "Outstanding customer invoices by aging bucket"
            : "Outstanding vendor bills by aging bucket"}
        </p>
      </div>

      <AsOfDateFilter
        onGenerate={(date) => setAsOfDate(date)}
        isPending={query.isFetching}
      />

      {query.isFetching && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {query.data && !query.isFetching && (
        <Card>
          <CardHeader>
            <CardTitle>{title} as of {asOfDate?.toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Partner</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">1-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">90+ Days</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.partners.map((partner) => (
                  <TableRow key={partner.partnerId}>
                    <TableCell className="font-medium">
                      {partner.partnerName}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(partner.current)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(partner.days1to30)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(partner.days31to60)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono",
                        partner.days61to90 > 0 && "text-amber-600",
                      )}
                    >
                      {formatCurrency(partner.days61to90)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono",
                        partner.days90plus > 0 && "text-red-600 font-semibold",
                      )}
                    >
                      {formatCurrency(partner.days90plus)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(partner.total)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow className="border-t-2 bg-muted/30 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(query.data.totals.current)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(query.data.totals.days1to30)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(query.data.totals.days31to60)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(query.data.totals.days61to90)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(query.data.totals.days90plus)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(query.data.totals.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {query.data.partners.length === 0 && (
              <p className="mt-4 text-center text-muted-foreground">
                No outstanding {reportType === "receivable" ? "receivables" : "payables"} found.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
