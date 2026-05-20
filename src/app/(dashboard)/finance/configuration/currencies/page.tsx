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
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

export default function CurrenciesPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
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
    <PermissionGuard permission="finance:settings:manage">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("currencies")}</h1>
        <p className="text-muted-foreground">
          {t("currenciesDesc")}
        </p>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">
          {tc("loading")}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("availableCurrencies")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">{tc("code")}</TableHead>
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead className="w-20">{t("symbol")}</TableHead>
                  <TableHead className="w-24">{t("decimals")}</TableHead>
                  <TableHead className="w-24">{tc("status")}</TableHead>
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
                        {c.isActive ? tc("active") : tc("inactive")}
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
                          {c.isActive ? t("deactivate") : t("activate")}
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
              {t("rateManagement")} — {selectedCurrency.code}
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
              {t("baseCurrencyNote", { code: selectedCurrency.code })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </PermissionGuard>
  );
}
