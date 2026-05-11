"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2, GripVertical, Hotel } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Decimal } from "decimal.js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { OPS_COMPONENT_TYPE_LABELS, OPS_MARKUP_TYPE_LABELS } from "@/lib/constants/tour-ops";
import { opsComponentBulkSaveSchema } from "@/lib/validations/tour-ops";
import { trpc } from "@/lib/trpc";
import { AccommodationPickerDialog } from "@/components/tour-ops/accommodation-picker-dialog";

type BulkSaveForm = z.input<typeof opsComponentBulkSaveSchema>;

const COMPONENT_TYPES = Object.entries(OPS_COMPONENT_TYPE_LABELS) as [string, string][];

const NIGHT_TYPES = new Set(["ACCOMMODATION", "NILE_CRUISE"]);

function computeTotalCost(type: string | undefined, pricingBasis: string | undefined, unitCost: number, qty: number, nights: number, exchangeRate: number): Decimal {
  const nightsFactor = NIGHT_TYPES.has(type ?? "") ? Math.max(1, nights || 1) : 1;
  if (pricingBasis === "BULK") {
    return new Decimal(unitCost || 0).times(nightsFactor).times(exchangeRate || 1).toDecimalPlaces(2);
  }
  return new Decimal(qty || 0).times(unitCost || 0).times(nightsFactor).times(exchangeRate || 1).toDecimalPlaces(2);
}

function computeSellingPrice(type: string | undefined, unitCost: number, qty: number, nights: number, exchangeRate: number, markupType: string | undefined, markupValue: number, pricingBasis?: string): number {
  const totalCost = computeTotalCost(type, pricingBasis, unitCost, qty, nights, exchangeRate);
  if (markupType === "PERCENTAGE") {
    return totalCost.times(new Decimal(1).plus(new Decimal(markupValue || 0).div(100))).toDecimalPlaces(2).toNumber();
  }
  return totalCost.plus(markupValue || 0).toDecimalPlaces(2).toNumber();
}

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: pkg, isLoading } = trpc.tourOps.package.getById.useQuery({ id });

  const bulkSave = trpc.tourOps.component.bulkSave.useMutation({
    onSuccess: () => {
      toast.success("Components saved");
      utils.tourOps.package.getById.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePkg = trpc.tourOps.package.delete.useMutation({
    onSuccess: () => { toast.success("Template deleted"); router.push("/tour-ops/templates"); },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<BulkSaveForm>({
    resolver: zodResolver(opsComponentBulkSaveSchema),
    defaultValues: { packageId: id, components: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "components" });

  const [accomPickerIndex, setAccomPickerIndex] = useState<number | null>(null);

  function openAccomPicker(index: number) {
    setAccomPickerIndex(index);
  }

  function handleAccomSelected(data: {
    description: string;
    unitCost: number;
    currency: string;
    notes: string;
    refModuleEntityId?: string;
    refModuleEntityType?: string;
  }) {
    if (accomPickerIndex === null) return;
    const i = accomPickerIndex;
    form.setValue(`components.${i}.description`, data.description);
    form.setValue(`components.${i}.unitCost`, data.unitCost);
    form.setValue(`components.${i}.currency`, data.currency);
    form.setValue(`components.${i}.notes`, data.notes);
    form.setValue(`components.${i}.refModuleEntityId`, data.refModuleEntityId ?? "");
    form.setValue(`components.${i}.refModuleEntityType`, data.refModuleEntityType ?? "");
    setAccomPickerIndex(null);
  }

  useEffect(() => {
    if (pkg) {
      form.reset({
        packageId: id,
        components: pkg.components.map((c) => ({
          type: c.type,
          description: c.description,
          supplierId: c.supplierId ?? "",
          serviceDate: c.serviceDate ? c.serviceDate.toString().split("T")[0] : "",
          pricingBasis: (c.pricingBasis as "PER_PERSON" | "BULK") ?? "PER_PERSON",
          nights: c.nights ?? 1,
          qty: Number(c.qty),
          unitCost: Number(c.unitCost),
          currency: c.currency,
          exchangeRate: Number(c.exchangeRate),
          markupType: c.markupType,
          markupValue: Number(c.markupValue),
          notes: c.notes ?? "",
          sortOrder: c.sortOrder,
          refModuleEntityId: "",
          refModuleEntityType: "",
        })),
      });
    }
  }, [pkg, id, form]);

  const components = useWatch({ control: form.control, name: "components" });

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!pkg) return <div className="p-6">Package not found.</div>;

  const totalCost = components.reduce((s, c) => s + computeTotalCost(c.type, c.pricingBasis, Number(c.unitCost || 0), Number(c.qty || 0), Number(c.nights || 1), Number(c.exchangeRate || 1)).toNumber(), 0);
  const totalSelling = components.reduce((s, c) => s + computeSellingPrice(c.type, Number(c.unitCost || 0), Number(c.qty || 0), Number(c.nights || 1), Number(c.exchangeRate || 1), c.markupType, Number(c.markupValue || 0), c.pricingBasis), 0);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{pkg.name}</h1>
          <p className="text-sm text-muted-foreground">
            {pkg.isTemplate ? "Template" : `Package for file ${pkg.file?.code ?? ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { if (confirm("Delete this package/template?")) deletePkg.mutate({ id }); }}
            disabled={deletePkg.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-md border bg-muted/30 p-3 text-sm">
        <span className="text-muted-foreground">Total Cost:</span>
        <span className="font-medium">{pkg.baseCurrency} {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        <span className="text-muted-foreground ml-4">Total Selling:</span>
        <span className="font-medium text-green-600">{pkg.baseCurrency} {totalSelling.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        <span className="text-muted-foreground ml-4">Margin:</span>
        <span className={`font-medium ${totalSelling - totalCost >= 0 ? "text-green-600" : "text-red-600"}`}>
          {pkg.baseCurrency} {(totalSelling - totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => bulkSave.mutate(v))}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm">Components ({fields.length})</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  append({
                    type: "ACCOMMODATION",
                    description: "",
                    pricingBasis: "PER_PERSON",
                    nights: 1,
                    qty: 1,
                    unitCost: 0,
                    currency: pkg.baseCurrency,
                    exchangeRate: 1,
                    markupType: "PERCENTAGE",
                    markupValue: 0,
                    sortOrder: fields.length,
                    notes: "",
                    supplierId: "",
                    serviceDate: "",
                    refModuleEntityId: "",
                    refModuleEntityType: "",
                  })
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Component
              </Button>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No components. Click &quot;Add Component&quot; to start building the package.
                </p>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, i) => {
                    const comp = components[i];
                    const isBulk = comp?.pricingBasis === "BULK";
                    const compType = comp?.type ?? "";
                    const showNights = NIGHT_TYPES.has(compType);
                    const compCurrency = comp?.currency ?? pkg.baseCurrency;
                    const isForeignCurrency = compCurrency !== pkg.baseCurrency;
                    const totalCostBase = comp ? computeTotalCost(comp.type, comp.pricingBasis, Number(comp.unitCost || 0), Number(comp.qty || 0), Number(comp.nights || 1), Number(comp.exchangeRate || 1)).toNumber() : 0;
                    const selling = comp ? computeSellingPrice(comp.type, Number(comp.unitCost || 0), Number(comp.qty || 0), Number(comp.nights || 1), Number(comp.exchangeRate || 1), comp.markupType, Number(comp.markupValue || 0), comp.pricingBasis) : 0;
                    return (
                      <div key={field.id} className="rounded-md border p-3 space-y-2">
                        {/* Row 1: type / description / hotel picker / delete */}
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex flex-1 flex-wrap gap-2">
                            <FormField
                              control={form.control}
                              name={`components.${i}.type`}
                              render={({ field: f }) => (
                                <FormItem className="w-44">
                                  <Select value={f.value} onValueChange={f.onChange}>
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {COMPONENT_TYPES.map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`components.${i}.description`}
                              render={({ field: f }) => (
                                <FormItem className="flex-1 min-w-40">
                                  <FormControl>
                                    <Input {...f} placeholder="Description" className="h-8 text-xs" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {components[i]?.type === "ACCOMMODATION" && (
                              <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={() => openAccomPicker(i)}>
                                <Hotel className="mr-1 h-3 w-3" /> Pick Hotel
                              </Button>
                            )}
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(i)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>

                        {/* Row 2: pricing basis toggle + cost fields */}
                        <div className="ml-6 flex flex-wrap items-end gap-2 text-xs">
                          {/* Pricing basis */}
                          <FormField
                            control={form.control}
                            name={`components.${i}.pricingBasis`}
                            render={({ field: f }) => (
                              <FormItem className="w-32">
                                <FormLabel className="text-[10px] text-muted-foreground">Pricing</FormLabel>
                                <div className="flex rounded-md border overflow-hidden h-7">
                                  {(["PER_PERSON", "BULK"] as const).map((v) => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => f.onChange(v)}
                                      className={`flex-1 text-[10px] font-medium transition-colors ${f.value === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                                    >
                                      {v === "PER_PERSON" ? "/ pax" : "Bulk"}
                                    </button>
                                  ))}
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Nights — only for ACCOMMODATION / NILE_CRUISE */}
                          {showNights && (
                            <FormField
                              control={form.control}
                              name={`components.${i}.nights`}
                              render={({ field: f }) => (
                                <FormItem className="w-16">
                                  <FormLabel className="text-[10px] text-muted-foreground">Nights</FormLabel>
                                  <FormControl>
                                    <Input type="number" min={1} step={1} className="h-7 text-xs" {...f} onChange={(e) => f.onChange(parseInt(e.target.value, 10) || 1)} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Qty — hidden for BULK */}
                          {!isBulk && (
                            <FormField
                              control={form.control}
                              name={`components.${i}.qty`}
                              render={({ field: f }) => (
                                <FormItem className="w-16">
                                  <FormLabel className="text-[10px] text-muted-foreground">Qty / Pax</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="any" className="h-7 text-xs" {...f} onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Unit Cost */}
                          <FormField
                            control={form.control}
                            name={`components.${i}.unitCost`}
                            render={({ field: f }) => (
                              <FormItem className="w-28">
                                <FormLabel className="text-[10px] text-muted-foreground">
                                  {isBulk ? "Bulk Cost" : "Unit Cost"}
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" step="any" className="h-7 text-xs" {...f} onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* Currency */}
                          <FormField
                            control={form.control}
                            name={`components.${i}.currency`}
                            render={({ field: f }) => (
                              <FormItem className="w-20">
                                <FormLabel className="text-[10px] text-muted-foreground">Currency</FormLabel>
                                <FormControl>
                                  <Input {...f} className={`h-7 text-xs font-mono ${isForeignCurrency ? "border-amber-400 text-amber-600" : ""}`} placeholder="USD" maxLength={3} onChange={(e) => f.onChange(e.target.value.toUpperCase())} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* ROE — only shown when currency differs from package base */}
                          {isForeignCurrency && (
                            <FormField
                              control={form.control}
                              name={`components.${i}.exchangeRate`}
                              render={({ field: f }) => (
                                <FormItem className="w-24">
                                  <FormLabel className="text-[10px] text-amber-600 font-medium">
                                    ROE → {pkg.baseCurrency}
                                  </FormLabel>
                                  <FormControl>
                                    <Input type="number" step="any" className="h-7 text-xs border-amber-400" {...f} onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Markup */}
                          <FormField
                            control={form.control}
                            name={`components.${i}.markupType`}
                            render={({ field: f }) => (
                              <FormItem className="w-32">
                                <FormLabel className="text-[10px] text-muted-foreground">Markup</FormLabel>
                                <Select value={f.value} onValueChange={f.onChange}>
                                  <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {Object.entries(OPS_MARKUP_TYPE_LABELS).map(([v, l]) => (
                                      <SelectItem key={v} value={v}>{l}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`components.${i}.markupValue`}
                            render={({ field: f }) => (
                              <FormItem className="w-20">
                                <FormLabel className="text-[10px] text-muted-foreground">Value</FormLabel>
                                <FormControl>
                                  <Input type="number" step="any" className="h-7 text-xs" {...f} onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* Cost & selling summary */}
                          <div className="flex flex-col gap-0.5 pb-0.5 text-[10px]">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <span>Cost:</span>
                              <span className="font-medium text-foreground font-mono">
                                {isForeignCurrency
                                  ? <>{compCurrency} {Number(comp?.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}{showNights ? ` × ${comp?.nights ?? 1}n` : ""} <span className="text-muted-foreground">= {pkg.baseCurrency} {totalCostBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></>
                                  : <>{pkg.baseCurrency} {totalCostBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}{showNights ? <span className="text-muted-foreground ml-1">({comp?.nights ?? 1} nights)</span> : null}</>
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <span>→ Selling:</span>
                              <span className="font-medium text-green-600 font-mono">{pkg.baseCurrency} {selling.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={bulkSave.isPending}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {bulkSave.isPending ? "Saving..." : "Save Components"}
            </Button>
          </div>
        </form>
      </Form>

      <AccommodationPickerDialog
        open={accomPickerIndex !== null}
        onClose={() => setAccomPickerIndex(null)}
        serviceDate={
          accomPickerIndex !== null
            ? (components[accomPickerIndex]?.serviceDate as string | undefined)
            : undefined
        }
        onSelect={handleAccomSelected}
      />
    </div>
  );
}
