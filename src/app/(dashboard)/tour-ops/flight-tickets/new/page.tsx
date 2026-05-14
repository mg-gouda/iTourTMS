"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

// ── Schemas ────────────────────────────────────────────────────────────────

const legSchema = z.object({
  sequence: z.number().int().min(1),
  origin: z.string().min(1, "Required"),
  destination: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  takeOffTime: z.string().optional(),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  terminal: z.string().optional(),
});

// ONE_WAY / RETURN: each compact row = one ticket entry
const ticketEntrySchema = z.object({
  clientName: z.string().optional(),
  departureDate: z.string().min(1, "Required"),
  origin: z.string().min(1, "Required"),
  destination: z.string().min(1, "Required"),
  flightNumber: z.string().optional(),
  takeOffTime: z.string().optional(),
  terminal: z.string().optional(),
  airline: z.string().optional(),
  ticketNumber: z.string().optional(),
  // return-specific (ignored for ONE_WAY)
  returnDate: z.string().optional(),
  returnFlightNumber: z.string().optional(),
  returnTakeOffTime: z.string().optional(),
  returnTerminal: z.string().optional(),
  returnAirline: z.string().optional(),
});

const schema = z.object({
  opsFileId: z.string().optional(),
  issueDate: z.string().optional(),
  flightType: z.enum(["ONE_WAY", "RETURN", "MULTI_LEG"]),
  // ONE_WAY / RETURN — per-ticket entries
  ticketEntries: z.array(ticketEntrySchema),
  // MULTI_LEG — single ticket fields
  clientName: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  departureDate: z.string().optional(),
  takeOffTime: z.string().optional(),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  terminal: z.string().optional(),
  ticketNumber: z.string().optional(),
  legs: z.array(legSchema).optional(),
  // Shared pricing
  pricingBasis: z.enum(["PER_PERSON", "BULK"]),
  pax: z.number().int().min(1),
  buyingRate: z.number().min(0),
  sellingRate: z.number().min(0),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]),
  commissionValue: z.number().min(0),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ────────────────────────────────────────────────────────────────

function FC({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground leading-none whitespace-nowrap">
        {label}
      </span>
      {children}
    </div>
  );
}

function CI({
  name,
  control,
  placeholder,
  type,
}: {
  name: string;
  control: any;
  placeholder?: string;
  type?: string;
}) {
  const { field } = useController({ name, control });
  return (
    <Input {...field} type={type} placeholder={placeholder} className="h-7 text-xs px-1.5" />
  );
}

function CT({ name, control }: { name: string; control: any }) {
  const { field } = useController({ name, control });
  return (
    <Input
      type="text"
      placeholder="HH:MM"
      maxLength={5}
      value={field.value ?? ""}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9:]/g, "");
        if (v.length === 2 && !v.includes(":") && (field.value ?? "").length < 2)
          field.onChange(v + ":");
        else field.onChange(v);
      }}
      className="h-7 text-xs px-1.5"
    />
  );
}

const blankEntry = (): z.infer<typeof ticketEntrySchema> => ({
  clientName: "",
  departureDate: "",
  origin: "",
  destination: "",
  flightNumber: "",
  takeOffTime: "",
  terminal: "",
  airline: "",
  ticketNumber: "",
  returnDate: "",
  returnFlightNumber: "",
  returnTakeOffTime: "",
  returnTerminal: "",
  returnAirline: "",
});

// ── Form ────────────────────────────────────────────────────────────────────

function NewFlightTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get("fileId") ?? undefined;
  const [batchPending, setBatchPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      opsFileId: fileId ?? "",
      issueDate: "",
      flightType: "ONE_WAY",
      ticketEntries: [blankEntry()],
      clientName: "",
      origin: "",
      destination: "",
      departureDate: "",
      takeOffTime: "",
      airline: "",
      flightNumber: "",
      terminal: "",
      ticketNumber: "",
      legs: [
        { sequence: 1, origin: "", destination: "", date: "", takeOffTime: "", airline: "", flightNumber: "", terminal: "" },
        { sequence: 2, origin: "", destination: "", date: "", takeOffTime: "", airline: "", flightNumber: "", terminal: "" },
      ],
      pricingBasis: "PER_PERSON",
      pax: 1,
      buyingRate: 0,
      sellingRate: 0,
      commissionType: "PERCENTAGE",
      commissionValue: 0,
      notes: "",
    },
  });

  const {
    fields: ticketFields,
    append: appendTicket,
    remove: removeTicket,
  } = useFieldArray({ control: form.control, name: "ticketEntries" });

  const {
    fields: legFields,
    append: appendLeg,
    remove: removeLeg,
  } = useFieldArray({ control: form.control, name: "legs" });

  const createMutation = trpc.tourOps.flightTicket.create.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const flightType = form.watch("flightType");
  const pricingBasis = form.watch("pricingBasis");
  const commissionType = form.watch("commissionType");
  const pax = form.watch("pax") || 1;
  const buyingRate = form.watch("buyingRate") || 0;
  const sellingRate = form.watch("sellingRate") || 0;
  const commissionValue = form.watch("commissionValue") || 0;
  const mult = pricingBasis === "PER_PERSON" ? pax : 1;
  const totalBuying = buyingRate * mult;
  const totalRevenue = sellingRate * mult;
  const commissionAmount =
    commissionType === "PERCENTAGE" ? (totalBuying * commissionValue) / 100 : commissionValue;
  const totalCost = totalBuying + commissionAmount;
  const profit = totalRevenue - totalCost;
  const marginPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  const isPending = createMutation.isPending || batchPending;

  async function onSubmit(values: FormValues) {
    const shared = {
      opsFileId: values.opsFileId || undefined,
      issueDate: values.issueDate || undefined,
      pricingBasis: values.pricingBasis,
      pax: values.pax,
      buyingRate: values.buyingRate,
      sellingRate: values.sellingRate,
      commissionType: values.commissionType,
      commissionValue: values.commissionValue,
      notes: values.notes || undefined,
    };

    if (values.flightType === "MULTI_LEG") {
      createMutation.mutate(
        {
          ...shared,
          flightType: "MULTI_LEG",
          clientName: values.clientName || undefined,
          origin: values.origin || "",
          destination: values.destination || "",
          departureDate: values.departureDate || "",
          ticketNumber: values.ticketNumber || undefined,
          legs: values.legs,
        },
        {
          onSuccess: (data) => {
            toast.success(`Ticket ${data.code} created`);
            router.push(`/tour-ops/flight-tickets/${data.id}`);
          },
        }
      );
      return;
    }

    // ONE_WAY / RETURN: create one ticket per entry
    const entries = values.ticketEntries ?? [];
    if (!entries.length) return;
    setBatchPending(true);
    try {
      const results: Array<{ id: string; code: string }> = [];
      for (const entry of entries) {
        const result = await createMutation.mutateAsync({
          ...shared,
          flightType: values.flightType,
          clientName: entry.clientName || undefined,
          origin: entry.origin,
          destination: entry.destination,
          departureDate: entry.departureDate,
          flightNumber: entry.flightNumber || undefined,
          takeOffTime: entry.takeOffTime || undefined,
          terminal: entry.terminal || undefined,
          airline: entry.airline || undefined,
          ticketNumber: entry.ticketNumber || undefined,
          returnDate: entry.returnDate || undefined,
          returnFlightNumber: entry.returnFlightNumber || undefined,
          returnTakeOffTime: entry.returnTakeOffTime || undefined,
          returnTerminal: entry.returnTerminal || undefined,
          returnAirline: entry.returnAirline || undefined,
        });
        results.push(result);
      }
      if (results.length === 1) {
        toast.success(`Ticket ${results[0].code} created`);
        router.push(`/tour-ops/flight-tickets/${results[0].id}`);
      } else {
        toast.success(`${results.length} tickets created`);
        router.push(`/tour-ops/flight-tickets`);
      }
    } catch {
      // error already toasted by onError
    } finally {
      setBatchPending(false);
    }
  }

  return (
    <div className="space-y-4 p-6 max-w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tour-ops/flight-tickets">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">New Flight Ticket</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Flight Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Flight Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Row 1: Flight Type | Linked Ops File | Issue Date */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="flightType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight Type</FormLabel>
                      <FormControl>
                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4 mt-1">
                          {[["ONE_WAY", "One Way"], ["RETURN", "Return"], ["MULTI_LEG", "Multiple Legs"]].map(([v, l]) => (
                            <div key={v} className="flex items-center gap-1.5">
                              <RadioGroupItem value={v} id={`ft-${v}`} />
                              <Label htmlFor={`ft-${v}`} className="cursor-pointer font-normal text-sm">{l}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="opsFileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Ops File (optional)</FormLabel>
                      <FormControl><Input placeholder="File ID or leave blank" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t" />

              {/* Compact flight rows */}
              {flightType === "MULTI_LEG" ? (
                /* ── MULTI_LEG: client name col + leg rows ── */
                <div className="space-y-2">
                  {legFields.map((legField, idx) => (
                    <div key={legField.id} className="flex items-end gap-2">
                      {idx === 0 ? (
                        <FC label="Client Name" className="w-36 shrink-0">
                          <CI name="clientName" control={form.control} placeholder="Client..." />
                        </FC>
                      ) : (
                        <div className="w-36 shrink-0" />
                      )}

                      <div className="w-px self-stretch bg-border shrink-0" />

                      <FC label="Date" className="flex-1 min-w-0">
                        <CI name={`legs.${idx}.date`} control={form.control} type="date" />
                      </FC>
                      <FC label="Origin" className="flex-1 min-w-0">
                        <CI name={`legs.${idx}.origin`} control={form.control} placeholder="CAI" />
                      </FC>
                      <FC label="Destination" className="flex-1 min-w-0">
                        <CI name={`legs.${idx}.destination`} control={form.control} placeholder="LHR" />
                      </FC>
                      <FC label="Flight No." className="flex-1 min-w-0">
                        <CI name={`legs.${idx}.flightNumber`} control={form.control} placeholder="MS777" />
                      </FC>
                      <FC label="Time (24h)" className="flex-1 min-w-0">
                        <CT name={`legs.${idx}.takeOffTime`} control={form.control} />
                      </FC>
                      <FC label="Terminal" className="flex-1 min-w-0">
                        <CI name={`legs.${idx}.terminal`} control={form.control} placeholder="T1" />
                      </FC>
                      <FC label="Carrier" className="flex-1 min-w-0">
                        <CI name={`legs.${idx}.airline`} control={form.control} placeholder="EgyptAir" />
                      </FC>

                      {/* Ticket No. on first leg only */}
                      {idx === 0 ? (
                        <FC label="Ticket No." className="flex-1 min-w-0">
                          <CI name="ticketNumber" control={form.control} placeholder="077-..." />
                        </FC>
                      ) : (
                        <div className="flex-1 min-w-0" />
                      )}

                      {idx === legFields.length - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 self-end shrink-0"
                          onClick={() =>
                            appendLeg({ sequence: legFields.length + 1, origin: "", destination: "", date: "", takeOffTime: "", airline: "", flightNumber: "", terminal: "" })
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {idx >= 2 && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 self-end shrink-0" onClick={() => removeLeg(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                      {idx === legFields.length - 1 && (
                        <Button type="submit" size="icon" className="h-7 w-7 self-end shrink-0" disabled={isPending}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* ── ONE_WAY / RETURN: one row per ticket entry ── */
                <div className="space-y-3">
                  {ticketFields.map((ticketField, tIdx) => (
                    <div key={ticketField.id} className="space-y-2">

                      {/* Outbound row */}
                      <div className="flex items-end gap-2">
                        <FC label="Client Name" className="w-36 shrink-0">
                          <CI name={`ticketEntries.${tIdx}.clientName`} control={form.control} placeholder="Client..." />
                        </FC>

                        <div className="w-px self-stretch bg-border shrink-0" />

                        <FC label="Departure Date" className="flex-1 min-w-0">
                          <CI name={`ticketEntries.${tIdx}.departureDate`} control={form.control} type="date" />
                        </FC>
                        <FC label="Origin" className="flex-1 min-w-0">
                          <CI name={`ticketEntries.${tIdx}.origin`} control={form.control} placeholder="CAI" />
                        </FC>
                        <FC label="Destination" className="flex-1 min-w-0">
                          <CI name={`ticketEntries.${tIdx}.destination`} control={form.control} placeholder="LHR" />
                        </FC>
                        <FC label="Flight No." className="flex-1 min-w-0">
                          <CI name={`ticketEntries.${tIdx}.flightNumber`} control={form.control} placeholder="MS777" />
                        </FC>
                        <FC label="Time (24h)" className="flex-1 min-w-0">
                          <CT name={`ticketEntries.${tIdx}.takeOffTime`} control={form.control} />
                        </FC>
                        <FC label="Terminal" className="flex-1 min-w-0">
                          <CI name={`ticketEntries.${tIdx}.terminal`} control={form.control} placeholder="T1" />
                        </FC>
                        <FC label="Carrier" className="flex-1 min-w-0">
                          <CI name={`ticketEntries.${tIdx}.airline`} control={form.control} placeholder="EgyptAir" />
                        </FC>
                        <FC label="Ticket No." className="flex-1 min-w-0">
                          <CI name={`ticketEntries.${tIdx}.ticketNumber`} control={form.control} placeholder="077-..." />
                        </FC>

                        {tIdx > 0 && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 self-end shrink-0" onClick={() => removeTicket(tIdx)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                        {tIdx === ticketFields.length - 1 && (
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7 self-end shrink-0" onClick={() => appendTicket(blankEntry())}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {tIdx === ticketFields.length - 1 && (
                          <Button type="submit" size="icon" className="h-7 w-7 self-end shrink-0" disabled={isPending}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Return sub-row (RETURN only) */}
                      {flightType === "RETURN" && (
                        <div className="flex items-end gap-2">
                          <div className="w-36 shrink-0" />
                          <div className="w-px shrink-0" />

                          <FC label="Return Date" className="flex-1 min-w-0">
                            <CI name={`ticketEntries.${tIdx}.returnDate`} control={form.control} type="date" />
                          </FC>
                          <FC label="Origin" className="flex-1 min-w-0">
                            <CI name={`ticketEntries.${tIdx}.destination`} control={form.control} placeholder="LHR" />
                          </FC>
                          <FC label="Destination" className="flex-1 min-w-0">
                            <CI name={`ticketEntries.${tIdx}.origin`} control={form.control} placeholder="CAI" />
                          </FC>
                          <FC label="Return Flight No." className="flex-1 min-w-0">
                            <CI name={`ticketEntries.${tIdx}.returnFlightNumber`} control={form.control} placeholder="MS778" />
                          </FC>
                          <FC label="Time (24h)" className="flex-1 min-w-0">
                            <CT name={`ticketEntries.${tIdx}.returnTakeOffTime`} control={form.control} />
                          </FC>
                          <FC label="Terminal" className="flex-1 min-w-0">
                            <CI name={`ticketEntries.${tIdx}.returnTerminal`} control={form.control} placeholder="T1" />
                          </FC>
                          <FC label="Carrier" className="flex-1 min-w-0">
                            <CI name={`ticketEntries.${tIdx}.returnAirline`} control={form.control} placeholder="EgyptAir" />
                          </FC>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Pricing</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="pricingBasis" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pricing Basis</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="PER_PERSON">Per Person</SelectItem>
                      <SelectItem value="BULK">Bulk</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {pricingBasis === "PER_PERSON" && (
                <FormField control={form.control} name="pax" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pax</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="buyingRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Buying Rate (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sellingRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Rate (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="commissionType" render={({ field }) => (
                <FormItem>
                  <FormLabel>3rd Party Commission Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="commissionValue" render={({ field }) => (
                <FormItem>
                  <FormLabel>{commissionType === "PERCENTAGE" ? "Commission %" : "Commission Amount (USD)"}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* P&L Preview */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">P&amp;L Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Revenue</span>
                  <span className="font-medium">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission Amount</span>
                  <span className="text-orange-600">${commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="text-red-600">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit</span>
                  <span className={`font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margin %</span>
                  <span className={`font-semibold ${marginPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {marginPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea placeholder="Internal notes..." rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/tour-ops/flight-tickets">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function NewFlightTicketPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <NewFlightTicketForm />
    </Suspense>
  );
}
