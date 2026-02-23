"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

interface CurrencyRatePanelProps {
  currencyId: string;
  currencyCode: string;
  baseCurrencyCode: string;
}

export function CurrencyRatePanel({
  currencyId,
  currencyCode,
  baseCurrencyCode,
}: CurrencyRatePanelProps) {
  const utils = trpc.useUtils();

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [rate, setRate] = useState("");

  const { data, isLoading } = trpc.finance.currency.listRates.useQuery(
    { currencyId, limit: 50 },
  );

  const upsertMutation = trpc.finance.currency.upsertRate.useMutation({
    onSuccess: () => {
      utils.finance.currency.listRates.invalidate({ currencyId });
      setRate("");
    },
  });

  const deleteMutation = trpc.finance.currency.deleteRate.useMutation({
    onSuccess: () => {
      utils.finance.currency.listRates.invalidate({ currencyId });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rateNum = parseFloat(rate);
    if (!rateNum || rateNum <= 0) return;
    upsertMutation.mutate({
      currencyId,
      date: new Date(date),
      rate: rateNum,
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">
        Exchange Rates: 1 {currencyCode} = ? {baseCurrencyCode}
      </h3>

      {/* Add rate form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="space-y-1">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>Rate</Label>
          <Input
            type="number"
            step="0.000001"
            min="0.000001"
            placeholder="e.g. 50.25"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={upsertMutation.isPending || !rate}
        >
          {upsertMutation.isPending ? "Saving..." : "Save Rate"}
        </Button>
      </form>

      {/* Rate history table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading rates...</p>
      ) : (data?.items?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rates recorded yet. Add a rate above to enable multi-currency
          transactions.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Date</TableHead>
              <TableHead className="w-32 text-right">Rate</TableHead>
              <TableHead className="w-24">Source</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data!.items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {new Date(r.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Number(r.rate).toFixed(6)}
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {r.source ?? "manual"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ id: r.id })}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
