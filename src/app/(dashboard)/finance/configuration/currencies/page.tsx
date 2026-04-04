"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CurrencyRatePanel } from "@/components/finance/currency-rate-panel";
import { trpc } from "@/lib/trpc";

export default function CurrenciesPage() {
  const utils = trpc.useUtils();
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string | null>(
    null,
  );

  const { data: currencies, isLoading } =
    trpc.finance.currency.list.useQuery({ activeOnly: false });
  const { data: baseCurrency } =
    trpc.finance.currency.getBaseCurrency.useQuery();

  const toggleMutation = trpc.finance.currency.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("Currency updated");
      utils.finance.currency.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedCurrency = currencies?.find((c) => c.id === selectedCurrencyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Currencies</h1>
        <p className="text-muted-foreground">
          Manage currencies and exchange rates for multi-currency transactions.
        </p>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Available Currencies</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-20">Symbol</TableHead>
                  <TableHead className="w-24">Decimals</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(currencies ?? []).map((c) => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer ${selectedCurrencyId === c.id ? "bg-muted" : ""}`}
                    onClick={() =>
                      setSelectedCurrencyId(
                        selectedCurrencyId === c.id ? null : c.id,
                      )
                    }
                  >
                    <TableCell className="font-mono font-semibold">
                      {c.code}
                    </TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.symbol}</TableCell>
                    <TableCell>{c.decimals}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.isActive ? "default" : "secondary"}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {baseCurrency && c.id !== baseCurrency.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMutation.mutate({ id: c.id, isActive: !c.isActive });
                          }}
                        >
                          {c.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expandable Rate Management Panel */}
      {selectedCurrency && baseCurrency && selectedCurrency.id !== baseCurrency.id && (
        <Card>
          <CardHeader>
            <CardTitle>
              Rate Management — {selectedCurrency.code}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyRatePanel
              currencyId={selectedCurrency.id}
              currencyCode={selectedCurrency.code}
              baseCurrencyCode={baseCurrency.code}
            />
          </CardContent>
        </Card>
      )}

      {selectedCurrency && baseCurrency && selectedCurrency.id === baseCurrency.id && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {selectedCurrency.code} is the base currency. Exchange rates are
              not needed for the base currency.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
