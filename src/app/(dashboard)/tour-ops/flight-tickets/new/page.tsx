"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm, useController, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  returnDate: z.string().optional(),
  returnFlightNumber: z.string().optional(),
  returnTakeOffTime: z.string().optional(),
  returnTerminal: z.string().optional(),
  returnAirline: z.string().optional(),
});

const fareLineSchema = z.object({
  passengerLabel: z.string().optional(),
  classCode: z.string().optional(),
  baseFare: z.number().min(0).default(0),
  taxes: z.number().min(0).default(0),
  aviationCommType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  aviationCommValue: z.number().min(0).default(0),
  employeeId: z.string().optional(),
  empCommType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  empCommValue: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
});

const schema = z.object({
  opsFileId: z.string().optional(),
  issueDate: z.string().optional(),
  flightType: z.enum(["ONE_WAY", "RETURN", "MULTI_LEG"]),
  ticketEntries: z.array(ticketEntrySchema),
  // MULTI_LEG fields
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
  // Pricing
  transactionType: z.enum(["ISSUE", "REISSUE", "REFUND", "VOID", "REVALIDATE"]),
  vendorId: z.string().optional(),
  customerPartnerId: z.string().optional(),
  fareLines: z.array(fareLineSchema),
  changeFees: z.number().optional(),
  priceDifference: z.number().optional(),
  cancellationFees: z.number().optional(),
  voidFee: z.number().optional(),
  createAccountingMoves: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormValues = z.input<typeof schema>;
type FareLineValues = z.input<typeof fareLineSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────

function FC({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground leading-none whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

function CI({ name, control, placeholder, type }: { name: string; control: any; placeholder?: string; type?: string }) {
  const { field } = useController({ name, control });
  return <Input {...field} type={type} placeholder={placeholder} className="h-7 text-xs px-1.5" />;
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
        if (v.length === 2 && !v.includes(":") && (field.value ?? "").length < 2) field.onChange(v + ":");
        else field.onChange(v);
      }}
      className="h-7 text-xs px-1.5"
    />
  );
}

function numFmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeFareLine(fl: FareLineValues) {
  const base = fl.baseFare ?? 0;
  const taxes = fl.taxes ?? 0;
  const aviComm = fl.aviationCommType === "PERCENTAGE" ? (base * (fl.aviationCommValue ?? 0)) / 100 : (fl.aviationCommValue ?? 0);
  const empComm = fl.empCommType === "PERCENTAGE" ? (base * (fl.empCommValue ?? 0)) / 100 : (fl.empCommValue ?? 0);
  const totalCost = base + taxes + empComm - aviComm;
  const profit = (fl.sellingPrice ?? 0) - totalCost;
  const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  return { aviComm, empComm, totalCost, profit, margin };
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

const blankFareLine = (): FareLineValues => ({
  passengerLabel: "",
  classCode: "",
  baseFare: 0,
  taxes: 0,
  aviationCommType: "PERCENTAGE",
  aviationCommValue: 0,
  employeeId: "",
  empCommType: "PERCENTAGE",
  empCommValue: 0,
  sellingPrice: 0,
});

// ── Fare Line Row ──────────────────────────────────────────────────────────

function FareLineRow({
  index,
  control,
  employees,
  onRemove,
  canRemove,
}: {
  index: number;
  control: any;
  employees: { id: string; name: string | null; email: string }[];
  onRemove: () => void;
  canRemove: boolean;
}) {
  const watched = useWatch({ control, name: `fareLines.${index}` }) as FareLineValues;
  const { aviComm, empComm, totalCost, profit, margin } = computeFareLine(watched ?? blankFareLine());

  return (
    <div className="grid gap-1 items-end py-1.5 border-b last:border-b-0" style={{ gridTemplateColumns: "100px 60px 90px 80px 70px 90px 70px 140px 70px 90px 70px 80px 80px 70px 32px" }}>
      {/* Pax Label */}
      <CI name={`fareLines.${index}.passengerLabel`} control={control} placeholder="Pax 1" />
      {/* Class */}
      <CI name={`fareLines.${index}.classCode`} control={control} placeholder="Y" />
      {/* Base Fare */}
      <div>
        <NumCI name={`fareLines.${index}.baseFare`} control={control} />
      </div>
      {/* Taxes */}
      <div>
        <NumCI name={`fareLines.${index}.taxes`} control={control} />
      </div>
      {/* Avia Comm Type */}
      <CommTypeCI name={`fareLines.${index}.aviationCommType`} control={control} />
      {/* Avia Comm Value */}
      <div>
        <NumCI name={`fareLines.${index}.aviationCommValue`} control={control} />
      </div>
      {/* Avia Comm Amount (computed) */}
      <div className="flex items-end pb-0.5">
        <span className="text-xs text-green-600 font-medium whitespace-nowrap">-{numFmt(aviComm)}</span>
      </div>
      {/* Employee */}
      <EmployeeCI name={`fareLines.${index}.employeeId`} control={control} employees={employees} />
      {/* Emp Comm Type */}
      <CommTypeCI name={`fareLines.${index}.empCommType`} control={control} />
      {/* Emp Comm Value */}
      <div>
        <NumCI name={`fareLines.${index}.empCommValue`} control={control} />
      </div>
      {/* Emp Comm Amount (computed) */}
      <div className="flex items-end pb-0.5">
        <span className="text-xs text-orange-600 font-medium whitespace-nowrap">+{numFmt(empComm)}</span>
      </div>
      {/* Selling Price */}
      <div>
        <NumCI name={`fareLines.${index}.sellingPrice`} control={control} />
      </div>
      {/* Total Cost (computed) */}
      <div className="flex items-end pb-0.5">
        <span className="text-xs text-red-600 font-medium whitespace-nowrap">{numFmt(totalCost)}</span>
      </div>
      {/* Profit (computed) */}
      <div className="flex items-end pb-0.5">
        <span className={`text-xs font-medium whitespace-nowrap ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
          {numFmt(profit)}
        </span>
      </div>
      {/* Delete */}
      <div className="flex items-end">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove} disabled={!canRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NumCI({ name, control }: { name: string; control: any }) {
  const { field } = useController({ name, control });
  return (
    <Input
      type="number"
      min={0}
      step="0.01"
      value={field.value ?? 0}
      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
      className="h-7 text-xs px-1.5"
    />
  );
}

function CommTypeCI({ name, control }: { name: string; control: any }) {
  const { field } = useController({ name, control });
  return (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger className="h-7 text-xs px-1.5">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="PERCENTAGE">%</SelectItem>
        <SelectItem value="FIXED">$</SelectItem>
      </SelectContent>
    </Select>
  );
}

function EmployeeCI({ name, control, employees }: { name: string; control: any; employees: { id: string; name: string | null; email: string }[] }) {
  const { field } = useController({ name, control });
  return (
    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}>
      <SelectTrigger className="h-7 text-xs px-1.5">
        <SelectValue placeholder="Employee..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">— None —</SelectItem>
        {employees.map((e) => (
          <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Form ────────────────────────────────────────────────────────────────────

function NewFlightTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get("fileId") ?? undefined;
  const [batchPending, setBatchPending] = useState(false);

  const { data: vendors = [] } = trpc.tourOps.flightTicket.listVendors.useQuery();
  const { data: customers = [] } = trpc.tourOps.flightTicket.listCustomers.useQuery();
  const { data: employees = [] } = trpc.tourOps.flightTicket.listEmployees.useQuery();

  // Also need opsFiles list for linked file dropdown
  const { data: opsFilesData } = trpc.tourOps.file.list.useQuery({ pageSize: 200 });
  const opsFiles = opsFilesData?.items ?? [];

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
      transactionType: "ISSUE",
      vendorId: "",
      customerPartnerId: "",
      fareLines: [blankFareLine()],
      createAccountingMoves: false,
      notes: "",
    },
  });

  const { fields: ticketFields, append: appendTicket, remove: removeTicket } = useFieldArray({ control: form.control, name: "ticketEntries" });
  const { fields: legFields, append: appendLeg, remove: removeLeg } = useFieldArray({ control: form.control, name: "legs" });
  const { fields: fareLineFields, append: appendFareLine, remove: removeFareLine } = useFieldArray({ control: form.control, name: "fareLines" });

  const createMutation = trpc.tourOps.flightTicket.create.useMutation({ onError: (e) => toast.error(e.message) });

  const flightType = form.watch("flightType");
  const transactionType = form.watch("transactionType");
  const allFareLines = form.watch("fareLines");

  // Aggregate P&L from fare lines
  const aggTotals = (allFareLines ?? []).reduce(
    (acc, fl) => {
      const { totalCost, profit } = computeFareLine(fl);
      return {
        totalCost: acc.totalCost + totalCost,
        totalRevenue: acc.totalRevenue + (fl.sellingPrice ?? 0),
        profit: acc.profit + profit,
      };
    },
    { totalCost: 0, totalRevenue: 0, profit: 0 },
  );
  const aggMargin = aggTotals.totalCost > 0 ? (aggTotals.profit / aggTotals.totalCost) * 100 : 0;

  const isPending = createMutation.isPending || batchPending;

  async function buildShared(values: FormValues) {
    return {
      opsFileId: values.opsFileId || undefined,
      issueDate: values.issueDate || undefined,
      transactionType: values.transactionType,
      vendorId: values.vendorId || undefined,
      customerPartnerId: values.customerPartnerId || undefined,
      fareLines: (values.fareLines ?? []).map((fl, i) => ({ ...fl, sequence: i + 1 })),
      changeFees: values.changeFees,
      priceDifference: values.priceDifference,
      cancellationFees: values.cancellationFees,
      voidFee: values.voidFee,
      createAccountingMoves: values.createAccountingMoves,
      notes: values.notes || undefined,
      // legacy fields (aggregated from fare lines)
      pricingBasis: "PER_PERSON" as const,
      pax: 1,
      buyingRate: aggTotals.totalCost,
      sellingRate: aggTotals.totalRevenue,
      commissionType: "PERCENTAGE" as const,
      commissionValue: 0,
    };
  }

  async function onSubmit(values: FormValues) {
    const shared = await buildShared(values);

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
        },
      );
      return;
    }

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
        router.push("/tour-ops/flight-tickets");
      }
    } catch {
      // error already toasted
    } finally {
      setBatchPending(false);
    }
  }

  return (
    <div className="space-y-4 p-6 max-w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tour-ops/flight-tickets"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">New Flight Ticket</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Flight Details */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Flight Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Row 1: Flight Type | Linked Ops File | Issue Date */}
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="flightType" render={({ field }) => (
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
                )} />

                <FormField control={form.control} name="opsFileId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Ops File (optional)</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select file..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="_none">— None —</SelectItem>
                        {opsFiles.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="issueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="border-t" />

              {/* Compact flight rows */}
              {flightType === "MULTI_LEG" ? (
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
                      <FC label="Date" className="flex-1 min-w-0"><CI name={`legs.${idx}.date`} control={form.control} type="date" /></FC>
                      <FC label="Origin" className="flex-1 min-w-0"><CI name={`legs.${idx}.origin`} control={form.control} placeholder="CAI" /></FC>
                      <FC label="Destination" className="flex-1 min-w-0"><CI name={`legs.${idx}.destination`} control={form.control} placeholder="LHR" /></FC>
                      <FC label="Flight No." className="flex-1 min-w-0"><CI name={`legs.${idx}.flightNumber`} control={form.control} placeholder="MS777" /></FC>
                      <FC label="Time (24h)" className="flex-1 min-w-0"><CT name={`legs.${idx}.takeOffTime`} control={form.control} /></FC>
                      <FC label="Terminal" className="flex-1 min-w-0"><CI name={`legs.${idx}.terminal`} control={form.control} placeholder="T1" /></FC>
                      <FC label="Carrier" className="flex-1 min-w-0"><CI name={`legs.${idx}.airline`} control={form.control} placeholder="EgyptAir" /></FC>
                      {idx === 0 ? (
                        <FC label="Ticket No." className="flex-1 min-w-0"><CI name="ticketNumber" control={form.control} placeholder="077-..." /></FC>
                      ) : (
                        <div className="flex-1 min-w-0" />
                      )}
                      {idx === legFields.length - 1 && (
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7 self-end shrink-0"
                          onClick={() => appendLeg({ sequence: legFields.length + 1, origin: "", destination: "", date: "", takeOffTime: "", airline: "", flightNumber: "", terminal: "" })}>
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
                <div className="space-y-3">
                  {ticketFields.map((ticketField, tIdx) => (
                    <div key={ticketField.id} className="space-y-2">
                      <div className="flex items-end gap-2">
                        <FC label="Client Name" className="w-36 shrink-0">
                          <CI name={`ticketEntries.${tIdx}.clientName`} control={form.control} placeholder="Client..." />
                        </FC>
                        <div className="w-px self-stretch bg-border shrink-0" />
                        <FC label="Departure Date" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.departureDate`} control={form.control} type="date" /></FC>
                        <FC label="Origin" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.origin`} control={form.control} placeholder="CAI" /></FC>
                        <FC label="Destination" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.destination`} control={form.control} placeholder="LHR" /></FC>
                        <FC label="Flight No." className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.flightNumber`} control={form.control} placeholder="MS777" /></FC>
                        <FC label="Time (24h)" className="flex-1 min-w-0"><CT name={`ticketEntries.${tIdx}.takeOffTime`} control={form.control} /></FC>
                        <FC label="Terminal" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.terminal`} control={form.control} placeholder="T1" /></FC>
                        <FC label="Carrier" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.airline`} control={form.control} placeholder="EgyptAir" /></FC>
                        <FC label="Ticket No." className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.ticketNumber`} control={form.control} placeholder="077-..." /></FC>
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

                      {flightType === "RETURN" && (
                        <div className="flex items-end gap-2">
                          <div className="w-36 shrink-0" />
                          <div className="w-px shrink-0" />
                          <FC label="Return Date" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.returnDate`} control={form.control} type="date" /></FC>
                          <FC label="Origin" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.destination`} control={form.control} placeholder="LHR" /></FC>
                          <FC label="Destination" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.origin`} control={form.control} placeholder="CAI" /></FC>
                          <FC label="Return Flight No." className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.returnFlightNumber`} control={form.control} placeholder="MS778" /></FC>
                          <FC label="Time (24h)" className="flex-1 min-w-0"><CT name={`ticketEntries.${tIdx}.returnTakeOffTime`} control={form.control} /></FC>
                          <FC label="Terminal" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.returnTerminal`} control={form.control} placeholder="T1" /></FC>
                          <FC label="Carrier" className="flex-1 min-w-0"><CI name={`ticketEntries.${tIdx}.returnAirline`} control={form.control} placeholder="EgyptAir" /></FC>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Pricing ────────────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-5">

              {/* Row 1: Transaction Type | Vendor | Customer */}
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="transactionType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="ISSUE">Issue — New Ticket</SelectItem>
                        <SelectItem value="REISSUE">Reissue — Change / Exchange</SelectItem>
                        <SelectItem value="REVALIDATE">Revalidate — Date Change</SelectItem>
                        <SelectItem value="REFUND">Refund — Cancellation</SelectItem>
                        <SelectItem value="VOID">Void — Same-Day Cancel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="vendorId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (Airline / GDS)</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="_none">— None —</SelectItem>
                        {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Auto-generates vendor bill on save</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="customerPartnerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="_none">— None —</SelectItem>
                        {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Auto-generates customer invoice on save</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Transaction-specific conditional fields */}
              {(transactionType === "REISSUE" || transactionType === "REVALIDATE") && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-md border">
                  <FormField control={form.control} name="changeFees" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Fees</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground">Fee charged by airline for reissue</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priceDifference" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Difference</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00 (+ or -)"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground">New fare minus old fare (can be negative)</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {transactionType === "REFUND" && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Refund:</strong> Vendor bill will be reversed (receivable from vendor). Customer invoice will be reversed (credit note). Cancellation fees deducted from customer refund.
                  </p>
                  <FormField control={form.control} name="cancellationFees" render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Cancellation Fees (charged to customer)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {transactionType === "VOID" && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Void:</strong> Vendor gives a full free void (no charge). You can still charge the customer an admin / void processing fee.
                  </p>
                  <FormField control={form.control} name="voidFee" render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Admin Fee (charged to customer)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Fare Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fare Lines — Individual Pricing per Passenger / Class
                  </p>
                </div>

                {/* Table header */}
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid gap-1 px-1 pb-1 border-b" style={{ gridTemplateColumns: "100px 60px 90px 80px 70px 90px 70px 140px 70px 90px 70px 80px 80px 70px 32px" }}>
                      {["Pax / Label", "Class", "Base Fare", "Taxes", "Avia.%/$", "Avia.Val", "Avia.Disc", "Employee", "Emp.%/$", "Emp.Val", "Emp.Comm", "Sell Price", "Total Cost", "Profit", ""].map((h) => (
                        <span key={h} className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</span>
                      ))}
                    </div>

                    {fareLineFields.map((fl, idx) => (
                      <FareLineRow
                        key={fl.id}
                        index={idx}
                        control={form.control}
                        employees={employees}
                        onRemove={() => removeFareLine(idx)}
                        canRemove={fareLineFields.length > 1}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs gap-1"
                  onClick={() => appendFareLine(blankFareLine())}
                >
                  <Plus className="h-3 w-3" /> Add Fare Line
                </Button>
              </div>

              {/* Aggregate Totals */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-muted/40 rounded-md border text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Cost</p>
                  <p className="font-semibold text-red-600">{numFmt(aggTotals.totalCost)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Revenue</p>
                  <p className="font-semibold">{numFmt(aggTotals.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Profit</p>
                  <p className={`font-semibold ${aggTotals.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{numFmt(aggTotals.profit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Margin %</p>
                  <p className={`font-semibold ${aggMargin >= 0 ? "text-green-600" : "text-red-600"}`}>{aggMargin.toFixed(2)}%</p>
                </div>
              </div>

              {/* Auto accounting toggle */}
              <FormField control={form.control} name="createAccountingMoves" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 font-normal text-sm">
                    Auto-create vendor bill &amp; customer invoice on save
                  </FormLabel>
                </FormItem>
              )} />
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
