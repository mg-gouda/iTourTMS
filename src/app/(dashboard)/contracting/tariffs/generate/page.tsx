"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { tariffGenerateSchema } from "@/lib/validations/contracting";

type FormValues = z.infer<typeof tariffGenerateSchema>;

export default function GenerateTariffPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [previewInput, setPreviewInput] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(tariffGenerateSchema),
    defaultValues: {
      name: "",
      contractId: "",
      tourOperatorId: "",
      currencyCode: "",
    },
  });

  const { data: contracts } = trpc.contracting.contract.list.useQuery();
  const { data: tourOperators } = trpc.contracting.tourOperator.list.useQuery();
  const { data: markupRules } = trpc.contracting.markupRule.list.useQuery();

  const selectedContractId = form.watch("contractId");
  const selectedContract = contracts?.find((c) => c.id === selectedContractId);

  // Preview query — only runs when preview is requested
  const { data: previewData, isLoading: previewLoading } =
    trpc.contracting.tariff.preview.useQuery(previewInput!, {
      enabled: !!previewInput,
    });

  const generateMutation = trpc.contracting.tariff.generate.useMutation({
    onSuccess: (result) => {
      utils.contracting.tariff.list.invalidate();
      toast.success("Tariff generated successfully");
      router.push(`/contracting/tariffs/${result.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    generateMutation.mutate(values);
  };

  const handlePreview = async () => {
    const valid = await form.trigger();
    if (valid) {
      setPreviewInput(form.getValues());
    }
  };

  // Auto-resolve markup rule preview
  const selectedTOId = form.watch("tourOperatorId");
  const { data: resolvedRule } = trpc.contracting.markupRule.resolve.useQuery(
    { contractId: selectedContractId, tourOperatorId: selectedTOId },
    { enabled: !!selectedContractId && !!selectedTOId },
  );

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
            Create a tariff sheet for a contract and tour operator
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contracts?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.code})
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
                  name="tourOperatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Operator *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
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
                  name="currencyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. USD, EUR, GBP"
                          {...field}
                          value={
                            field.value ||
                            selectedContract?.baseCurrency?.code ||
                            ""
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {selectedContract?.baseCurrency &&
                          `Contract base currency: ${selectedContract.baseCurrency.code}`}
                      </FormDescription>
                      <FormMessage />
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
                            Auto-resolve (recommended)
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
                        Leave on auto-resolve to use the best-matching rule based
                        on scope hierarchy
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Show auto-resolved preview */}
                {!form.watch("markupRuleId") && resolvedRule && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Auto-resolved rule:
                    </p>
                    <p className="text-sm font-medium">{resolvedRule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {resolvedRule.markupType === "PERCENTAGE"
                        ? `${parseFloat(resolvedRule.value)}% markup`
                        : `${parseFloat(resolvedRule.value).toFixed(2)} ${resolvedRule.markupType.replace(/_/g, " ").toLowerCase()}`}
                    </p>
                  </div>
                )}

                {!form.watch("markupRuleId") &&
                  !resolvedRule &&
                  selectedContractId &&
                  selectedTOId && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        No matching markup rule found. Tariff will be generated
                        with zero markup (cost rates).
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={previewLoading}
            >
              {previewLoading ? "Loading preview..." : "Preview Rates"}
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending
                ? "Generating..."
                : "Generate Tariff"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/contracting/tariffs">Cancel</Link>
            </Button>
          </div>

          {/* Preview Section */}
          {previewData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Rate Preview</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{previewData.currencyCode}</Badge>
                    <Badge variant="outline">{previewData.rateBasis.replace(/_/g, " ")}</Badge>
                    {previewData.markupRuleName && (
                      <Badge variant="secondary">
                        Markup: {previewData.markupRuleName} (
                        {previewData.markupType === "PERCENTAGE"
                          ? `${previewData.markupValue}%`
                          : previewData.markupValue.toFixed(2)}
                        )
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {previewData.rates.length} rate entries across{" "}
                  {new Set(previewData.rates.map((r) => r.seasonId)).size} season(s),{" "}
                  {new Set(previewData.rates.map((r) => r.roomTypeId)).size} room type(s),{" "}
                  {new Set(previewData.rates.map((r) => r.mealBasisId)).size} meal basis(es)
                </p>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background">Season</TableHead>
                        <TableHead className="sticky top-0 bg-background">Room Type</TableHead>
                        <TableHead className="sticky top-0 bg-background">Meal</TableHead>
                        <TableHead className="sticky top-0 bg-background text-right">Base Rate</TableHead>
                        <TableHead className="sticky top-0 bg-background text-right">Markup</TableHead>
                        <TableHead className="sticky top-0 bg-background text-right">Selling Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rates.map((rate, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{rate.seasonName}</TableCell>
                          <TableCell>{rate.roomTypeName}</TableCell>
                          <TableCell>{rate.mealBasisName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {rate.baseRate.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            +{rate.markup.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {rate.sellingRate.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}
