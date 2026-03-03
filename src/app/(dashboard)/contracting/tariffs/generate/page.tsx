"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSeasonLabel } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { tariffBulkGenerateSchema } from "@/lib/validations/contracting";

type FormValues = z.infer<typeof tariffBulkGenerateSchema>;

export default function GenerateTariffPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(tariffBulkGenerateSchema),
    defaultValues: {
      name: "",
      tourOperatorId: "",
      marketId: undefined,
      seasonDateFrom: undefined,
      seasonDateTo: undefined,
    },
  });

  const { data: tourOperators } = trpc.contracting.tourOperator.list.useQuery();
  const { data: markets } = trpc.contracting.market.list.useQuery();
  const { data: markupRules } = trpc.contracting.markupRule.list.useQuery();

  const selectedTOId = form.watch("tourOperatorId");
  const selectedMarketId = form.watch("marketId");
  const selectedSeasonFrom = form.watch("seasonDateFrom");
  const selectedSeasonTo = form.watch("seasonDateTo");

  // Fetch contracts assigned to the selected TO, filtered by market
  const { data: matchedContracts } =
    trpc.contracting.tariff.contractsForTariff.useQuery(
      {
        tourOperatorId: selectedTOId,
        marketId: selectedMarketId || undefined,
      },
      { enabled: !!selectedTOId },
    );

  // Deduplicate seasons by date range across all matched contracts
  const seasonOptions = useMemo(() => {
    if (!matchedContracts) return [];
    const seen = new Map<string, { dateFrom: string; dateTo: string; label: string }>();
    for (const c of matchedContracts) {
      for (const s of c.seasons) {
        const from = s.dateFrom.toString().slice(0, 10);
        const to = s.dateTo.toString().slice(0, 10);
        const key = `${from}|${to}`;
        if (!seen.has(key)) {
          seen.set(key, {
            dateFrom: from,
            dateTo: to,
            label: formatSeasonLabel(from, to),
          });
        }
      }
    }
    return Array.from(seen.values());
  }, [matchedContracts]);

  // Contracts that will be affected (filtered by season if selected)
  const affectedContracts = useMemo(() => {
    if (!matchedContracts) return [];
    if (!selectedSeasonFrom || !selectedSeasonTo) return matchedContracts;
    return matchedContracts.filter((c) =>
      c.seasons.some(
        (s) =>
          s.dateFrom.toString().slice(0, 10) === selectedSeasonFrom &&
          s.dateTo.toString().slice(0, 10) === selectedSeasonTo,
      ),
    );
  }, [matchedContracts, selectedSeasonFrom, selectedSeasonTo]);

  const generateMutation = trpc.contracting.tariff.generateBulk.useMutation({
    onSuccess: (result) => {
      utils.contracting.tariff.list.invalidate();
      toast.success(
        `Generated ${result.count} tariff${result.count !== 1 ? "s" : ""} successfully`,
      );
      router.push("/contracting/tariffs");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    generateMutation.mutate(values);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contracting/tariffs">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Tariff</h1>
          <p className="text-muted-foreground">
            Generate tariff sheets for all contracts assigned to a tour operator
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tariff Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tariff Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Summer 2026 - TUI"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Each contract&apos;s tariff will be suffixed with the contract name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tourOperatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Operator *</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          // Reset dependent fields
                          form.setValue("seasonDateFrom", undefined);
                          form.setValue("seasonDateTo", undefined);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tour operator" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tourOperators?.map((to) => (
                            <SelectItem key={to.id} value={to.id}>
                              {to.name} ({to.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="marketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v === "__all__" ? undefined : v);
                          form.setValue("seasonDateFrom", undefined);
                          form.setValue("seasonDateTo", undefined);
                        }}
                        value={field.value ?? "__all__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All markets" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__all__">All Markets</SelectItem>
                          {markets?.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Filter contracts by market
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seasonDateFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Season</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          if (v === "__all__") {
                            form.setValue("seasonDateFrom", undefined);
                            form.setValue("seasonDateTo", undefined);
                          } else {
                            const opt = seasonOptions.find(
                              (s) => `${s.dateFrom}|${s.dateTo}` === v,
                            );
                            if (opt) {
                              form.setValue("seasonDateFrom", opt.dateFrom);
                              form.setValue("seasonDateTo", opt.dateTo);
                            }
                          }
                        }}
                        value={
                          field.value && selectedSeasonTo
                            ? `${field.value}|${selectedSeasonTo}`
                            : "__all__"
                        }
                        disabled={!selectedTOId || seasonOptions.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All seasons" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__all__">All Seasons</SelectItem>
                          {seasonOptions.map((s) => (
                            <SelectItem
                              key={`${s.dateFrom}|${s.dateTo}`}
                              value={`${s.dateFrom}|${s.dateTo}`}
                            >
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {selectedTOId
                          ? seasonOptions.length > 0
                            ? "Filter by season period"
                            : "No seasons found in matched contracts"
                          : "Select a tour operator first"}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Markup Rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="markupRuleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Markup Rule</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__auto__" ? undefined : v)
                        }
                        value={field.value ?? "__auto__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Auto-resolve" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__auto__">
                            Auto-resolve per contract (recommended)
                          </SelectItem>
                          {markupRules
                            ?.filter((r) => r.active)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name} ({r.markupType === "PERCENTAGE"
                                  ? `${parseFloat(r.value.toString())}%`
                                  : parseFloat(r.value.toString()).toFixed(2)})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Auto-resolve picks the best rule per contract based on
                        scope hierarchy
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Matched contracts summary */}
                {selectedTOId && (
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Contracts to generate ({affectedContracts.length}):
                    </p>
                    {affectedContracts.length === 0 ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        No contracts match the selected filters
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {affectedContracts.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>
                              {c.hotel.name}{" "}
                              <span className="font-mono text-xs text-muted-foreground">
                                {c.code}
                              </span>
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {c.baseCurrency?.code ?? "—"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={
                generateMutation.isPending || affectedContracts.length === 0
              }
            >
              {generateMutation.isPending
                ? "Generating..."
                : `Generate ${affectedContracts.length} Tariff${affectedContracts.length !== 1 ? "s" : ""}`}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/contracting/tariffs">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
