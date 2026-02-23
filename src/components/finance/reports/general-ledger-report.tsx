"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { AccountFilter } from "./report-filters";

export function GeneralLedgerReport() {
  const searchParams = useSearchParams();

  const [accountId, setAccountId] = useState(searchParams.get("accountId") ?? "");
  const [dateFrom, setDateFrom] = useState(
    searchParams.get("dateFrom") ?? "",
  );
  const [dateTo, setDateTo] = useState(
    searchParams.get("dateTo") ?? "",
  );
  const [queryParams, setQueryParams] = useState<{
    accountId: string;
    dateFrom?: Date;
    dateTo?: Date;
  } | null>(
    searchParams.get("accountId")
      ? {
          accountId: searchParams.get("accountId")!,
          dateFrom: searchParams.get("dateFrom")
            ? new Date(searchParams.get("dateFrom")!)
            : undefined,
          dateTo: searchParams.get("dateTo")
            ? new Date(searchParams.get("dateTo")!)
            : undefined,
        }
      : null,
  );

  const { data: accountsData } = trpc.finance.account.list.useQuery(
    { limit: 1000 },
  );
  const accounts = (accountsData as any)?.items ?? accountsData ?? [];

  const { data, isFetching } = trpc.finance.report.generalLedger.useQuery(
    {
      accountId: queryParams!.accountId,
      dateFrom: queryParams?.dateFrom,
      dateTo: queryParams?.dateTo,
    },
    { enabled: !!queryParams },
  );

  function handleGenerate() {
    if (!accountId) return;
    setQueryParams({
      accountId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  // Compute running balance from server's openingBalance
  let runningBalance = data?.openingBalance ?? 0;
  const linesWithBalance = (data?.lines ?? []).map((line) => {
    runningBalance += line.debit - line.credit;
    return { ...line, runningBalance };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">General Ledger</h1>
        <p className="text-muted-foreground">
          Detailed line items for a specific account
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <AccountFilter
          accounts={accounts}
          value={accountId}
          onChange={setAccountId}
        />
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={handleGenerate} disabled={!accountId || isFetching}>
          {isFetching ? "Loading..." : "Generate"}
        </Button>
      </div>

      {isFetching && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
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
              {data.account.code} — {data.account.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-32">Entry</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="w-28 text-right">Debit</TableHead>
                  <TableHead className="w-28 text-right">Credit</TableHead>
                  <TableHead className="w-32 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Opening Balance Row */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={4}>Opening Balance</TableCell>
                  <TableCell className="text-right font-mono">
                    {data.openingBalance >= 0
                      ? formatCurrency(data.openingBalance)
                      : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {data.openingBalance < 0
                      ? formatCurrency(Math.abs(data.openingBalance))
                      : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.openingBalance)}
                  </TableCell>
                </TableRow>

                {linesWithBalance.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {new Date(line.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {line.moveName}
                    </TableCell>
                    <TableCell>{line.partnerName ?? "—"}</TableCell>
                    <TableCell>{line.label ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debit > 0 ? formatCurrency(line.debit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.credit > 0 ? formatCurrency(line.credit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(line.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Closing Balance Row */}
                <TableRow className="border-t-2 bg-muted/30 font-bold">
                  <TableCell colSpan={4}>Closing Balance</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.lines.reduce((s, l) => s + l.debit, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.lines.reduce((s, l) => s + l.credit, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.closingBalance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {data.lines.length === 0 && (
              <p className="mt-4 text-center text-muted-foreground">
                No transactions found for this account in the selected period.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
