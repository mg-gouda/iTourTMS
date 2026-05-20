"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, Pencil, Plus, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useFieldArray, useForm, useController, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  OPS_FLIGHT_TICKET_STATUS_LABELS,
  OPS_FLIGHT_TICKET_STATUS_VARIANTS,
  OPS_FLIGHT_TYPE_LABELS,
  OPS_PRICING_BASIS_LABELS,
  OPS_MARKUP_TYPE_LABELS,
  OPS_FLIGHT_TX_TYPE_LABELS,
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

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

const editSchema = z.object({
  opsFileId: z.string().optional(),
  clientName: z.string().optional(),
  issueDate: z.string().optional(),
  flightType: z.enum(["ONE_WAY", "RETURN", "MULTI_LEG"]),
  origin: z.string().min(1, "Required"),
  destination: z.string().min(1, "Required"),
  departureDate: z.string().min(1, "Required"),
  returnDate: z.string().optional(),
  takeOffTime: z.string().optional(),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  terminal: z.string().optional(),
  returnFlightNumber: z.string().optional(),
  returnTakeOffTime: z.string().optional(),
  returnTerminal: z.string().optional(),
  returnAirline: z.string().optional(),
  ticketNumber: z.string().optional(),
  legs: z.array(legSchema).optional(),
  currencyId: z.string().optional(),
  transactionType: z.enum(["ISSUE", "REISSUE", "REFUND", "VOID", "REVALIDATE"]),
  vendorId: z.string().optional(),
  customerPartnerId: z.string().optional(),
  fareLines: z.array(fareLineSchema),
  changeFees: z.number().optional(),
  priceDifference: z.number().optional(),
  cancellationFees: z.number().optional(),
  voidFee: z.number().optional(),
  parentTicketId: z.string().optional(),
  notes: z.string().optional(),
});

type EditValues = z.input<typeof editSchema>;
type FareLineValues = z.input<typeof fareLineSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────

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

function FC({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground leading-none whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

function CompactInput({ name, control, placeholder, type }: { name: string; control: any; placeholder?: string; type?: string }) {
  const { field } = useController({ name, control });
  return <Input {...field} type={type} placeholder={placeholder} className="h-7 text-xs px-1.5" />;
}

function CompactTime({ name, control }: { name: string; control: any }) {
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

function NumCI({ name, control }: { name: string; control: any }) {
  const { field } = useController({ name, control });
  return (
    <Input
      type="number" min={0} step="0.01"
      value={field.value ?? 0}
      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
      className="h-7 text-xs px-1.5"
    />
  );
}

function NumCIWithCcy({ name, control, ccy }: { name: string; control: any; ccy?: string }) {
  const { field } = useController({ name, control });
  return (
    <div className="flex items-stretch">
      {ccy && (
        <span className="flex items-center px-1 bg-muted border border-r-0 rounded-l text-[9px] font-mono text-muted-foreground shrink-0">
          {ccy}
        </span>
      )}
      <Input
        type="number" min={0} step="0.01"
        value={field.value ?? 0}
        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
        className={`h-7 text-xs px-1.5 min-w-0 ${ccy ? "rounded-l-none border-l-0" : ""}`}
      />
    </div>
  );
}

function CommTypeCI({ name, control }: { name: string; control: any }) {
  const { field } = useController({ name, control });
  return (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger className="h-7 text-xs px-1.5"><SelectValue /></SelectTrigger>
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
      <SelectTrigger className="h-7 text-xs px-1.5"><SelectValue placeholder="Employee..." /></SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">— None —</SelectItem>
        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function FareLineRow({ index, control, employees, onRemove, canRemove, currencyCode }: {
  index: number; control: any;
  employees: { id: string; name: string | null; email: string }[];
  onRemove: () => void; canRemove: boolean;
  currencyCode?: string;
}) {
  const watched = useWatch({ control, name: `fareLines.${index}` }) as FareLineValues;
  const { aviComm, empComm, totalCost, profit } = computeFareLine(watched ?? blankFareLine());
  const ccy = currencyCode || undefined;
  return (
    <div className="grid gap-1 items-end py-1.5 border-b last:border-b-0"
      style={{ gridTemplateColumns: "100px 60px 115px 105px 70px 115px 70px 140px 70px 115px 70px 105px 80px 70px 32px" }}>
      <CompactInput name={`fareLines.${index}.passengerLabel`} control={control} placeholder="Pax 1" />
      <CompactInput name={`fareLines.${index}.classCode`} control={control} placeholder="Y" />
      <NumCIWithCcy name={`fareLines.${index}.baseFare`} control={control} ccy={ccy} />
      <NumCIWithCcy name={`fareLines.${index}.taxes`} control={control} ccy={ccy} />
      <CommTypeCI name={`fareLines.${index}.aviationCommType`} control={control} />
      <NumCIWithCcy name={`fareLines.${index}.aviationCommValue`} control={control} ccy={ccy} />
      <div className="flex items-end pb-0.5"><span className="text-xs text-green-600 font-medium whitespace-nowrap">-{numFmt(aviComm)}</span></div>
      <EmployeeCI name={`fareLines.${index}.employeeId`} control={control} employees={employees} />
      <CommTypeCI name={`fareLines.${index}.empCommType`} control={control} />
      <NumCIWithCcy name={`fareLines.${index}.empCommValue`} control={control} ccy={ccy} />
      <div className="flex items-end pb-0.5"><span className="text-xs text-orange-600 font-medium whitespace-nowrap">+{numFmt(empComm)}</span></div>
      <NumCIWithCcy name={`fareLines.${index}.sellingPrice`} control={control} ccy={ccy} />
      <div className="flex items-end pb-0.5"><span className="text-xs text-red-600 font-medium whitespace-nowrap">{numFmt(totalCost)}</span></div>
      <div className="flex items-end pb-0.5">
        <span className={`text-xs font-medium whitespace-nowrap ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>{numFmt(profit)}</span>
      </div>
      <div className="flex items-end">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove} disabled={!canRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function FlightTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const { data: ticket, isLoading } = trpc.tourOps.flightTicket.getById.useQuery({ id });
  const { data: vendors = [] } = trpc.tourOps.flightTicket.listVendors.useQuery();
  const { data: customers = [] } = trpc.tourOps.flightTicket.listCustomers.useQuery();
  const { data: employees = [] } = trpc.tourOps.flightTicket.listEmployees.useQuery();
  const { data: currencies = [] } = trpc.tourOps.flightTicket.listCurrencies.useQuery();
  const { data: linkableTickets = [] } = trpc.tourOps.flightTicket.listForLinking.useQuery(
    { opsFileId: ticket?.opsFileId ?? undefined, excludeId: id },
    { enabled: editing },
  );

  const updateMutation = trpc.tourOps.flightTicket.update.useMutation({
    onSuccess: () => {
      toast.success("Ticket updated");
      utils.tourOps.flightTicket.getById.invalidate({ id });
      setEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const postMutation = trpc.tourOps.flightTicket.post.useMutation({
    onSuccess: () => {
      toast.success("Ticket posted — journal entry created");
      utils.tourOps.flightTicket.getById.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.tourOps.flightTicket.cancel.useMutation({
    onSuccess: () => {
      toast.success("Ticket cancelled");
      utils.tourOps.flightTicket.getById.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      opsFileId: "", clientName: "", issueDate: "",
      flightType: "ONE_WAY",
      origin: "", destination: "", departureDate: "", returnDate: "",
      takeOffTime: "", airline: "", flightNumber: "", terminal: "",
      returnFlightNumber: "", returnTakeOffTime: "", returnTerminal: "", returnAirline: "",
      ticketNumber: "", legs: [],
      currencyId: "",
      transactionType: "ISSUE", vendorId: "", customerPartnerId: "",
      fareLines: [blankFareLine()],
      parentTicketId: "",
      notes: "",
    },
  });

  const { fields: legFields, append: appendLeg, remove: removeLeg } = useFieldArray({ control: form.control, name: "legs" });
  const { fields: fareLineFields, append: appendFareLine, remove: removeFareLine } = useFieldArray({ control: form.control, name: "fareLines" });

  function startEdit() {
    if (!ticket) return;
    const tkt = ticket as any;
    form.reset({
      opsFileId: ticket.opsFileId ?? "",
      clientName: ticket.clientName ?? "",
      issueDate: ticket.issueDate ? ticket.issueDate.toString().split("T")[0] : "",
      flightType: ticket.flightType as any,
      origin: ticket.origin,
      destination: ticket.destination,
      departureDate: ticket.departureDate.toString().split("T")[0],
      returnDate: ticket.returnDate ? ticket.returnDate.toString().split("T")[0] : "",
      takeOffTime: ticket.takeOffTime ?? "",
      airline: ticket.airline ?? "",
      flightNumber: ticket.flightNumber ?? "",
      terminal: ticket.terminal ?? "",
      returnFlightNumber: ticket.returnFlightNumber ?? "",
      returnTakeOffTime: tkt.returnTakeOffTime ?? "",
      returnTerminal: tkt.returnTerminal ?? "",
      returnAirline: tkt.returnAirline ?? "",
      ticketNumber: ticket.ticketNumber ?? "",
      legs: (ticket.legs ?? []).map((leg: any) => ({
        sequence: leg.sequence,
        origin: leg.origin,
        destination: leg.destination,
        date: leg.date.toString().split("T")[0],
        takeOffTime: leg.takeOffTime ?? "",
        airline: leg.airline ?? "",
        flightNumber: leg.flightNumber ?? "",
        terminal: leg.terminal ?? "",
      })),
      transactionType: (tkt.transactionType ?? "ISSUE") as any,
      vendorId: tkt.vendorId ?? "",
      customerPartnerId: tkt.customerPartnerId ?? "",
      fareLines: tkt.fareLines?.length
        ? tkt.fareLines.map((fl: any) => ({
            passengerLabel: fl.passengerLabel ?? "",
            classCode: fl.classCode ?? "",
            baseFare: Number(fl.baseFare),
            taxes: Number(fl.taxes),
            aviationCommType: fl.aviationCommType ?? "PERCENTAGE",
            aviationCommValue: Number(fl.aviationCommValue),
            employeeId: fl.employeeId ?? "",
            empCommType: fl.empCommType ?? "PERCENTAGE",
            empCommValue: Number(fl.empCommValue),
            sellingPrice: Number(fl.sellingPrice),
          }))
        : [blankFareLine()],
      changeFees: tkt.changeFees ? Number(tkt.changeFees) : undefined,
      priceDifference: tkt.priceDifference ? Number(tkt.priceDifference) : undefined,
      cancellationFees: tkt.cancellationFees ? Number(tkt.cancellationFees) : undefined,
      voidFee: tkt.voidFee ? Number(tkt.voidFee) : undefined,
      currencyId: tkt.currencyId ?? "",
      parentTicketId: tkt.parentTicketId ?? "",
      notes: ticket.notes ?? "",
    });
    setEditing(true);
  }

  const watchedFlightType = form.watch("flightType");
  const watchedTxType = form.watch("transactionType");
  const watchedCurrencyId = form.watch("currencyId");
  const selectedCurrencyCode = currencies.find((c) => c.id === watchedCurrencyId)?.code ?? "";
  const allFareLines = form.watch("fareLines");

  const aggTotals = (allFareLines ?? []).reduce(
    (acc, fl) => {
      const { totalCost, profit } = computeFareLine(fl);
      return { totalCost: acc.totalCost + totalCost, totalRevenue: acc.totalRevenue + (fl.sellingPrice ?? 0), profit: acc.profit + profit };
    },
    { totalCost: 0, totalRevenue: 0, profit: 0 },
  );
  const aggMargin = aggTotals.totalCost > 0 ? (aggTotals.profit / aggTotals.totalCost) * 100 : 0;

  function onSubmit(values: EditValues) {
    updateMutation.mutate({
      id,
      data: {
        ...values,
        opsFileId: values.opsFileId || undefined,
        clientName: values.clientName || undefined,
        issueDate: values.issueDate || undefined,
        returnDate: values.returnDate || undefined,
        takeOffTime: values.takeOffTime || undefined,
        returnTakeOffTime: values.returnTakeOffTime || undefined,
        returnTerminal: values.returnTerminal || undefined,
        returnAirline: values.returnAirline || undefined,
        vendorId: values.vendorId || undefined,
        customerPartnerId: values.customerPartnerId || undefined,
        fareLines: (values.fareLines ?? []).map((fl, i) => ({ ...fl, sequence: i + 1 })),
        legs: values.flightType === "MULTI_LEG" ? values.legs : [],
        currencyId: values.currencyId || undefined,
        parentTicketId: values.parentTicketId || undefined,
        // aggregate from fare lines
        buyingRate: aggTotals.totalCost,
        sellingRate: aggTotals.totalRevenue,
        pricingBasis: "PER_PERSON",
        pax: 1,
        commissionType: "PERCENTAGE",
        commissionValue: 0,
      },
    });
  }

  if (isLoading) return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (!ticket) return <div className="p-6 text-sm">Ticket not found.</div>;

  const tkt = ticket as any;
  const revenue = Number(ticket.totalRevenue);
  const cost = Number(ticket.totalCost);
  const profit = Number(ticket.profit);
  const marginPct = Number(ticket.marginPct);
  const isPosted = ticket.status === "POSTED";
  const isCancelled = ticket.status === "CANCELLED";

  return (
    <div className="space-y-4 p-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tour-ops/flight-tickets"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold font-mono">{ticket.code}</h1>
              <Badge variant={OPS_FLIGHT_TICKET_STATUS_VARIANTS[ticket.status] as any}>
                {OPS_FLIGHT_TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant="outline">{OPS_FLIGHT_TYPE_LABELS[ticket.flightType]}</Badge>
              <Badge variant="secondary">{OPS_FLIGHT_TX_TYPE_LABELS[(tkt.transactionType ?? "ISSUE") as keyof typeof OPS_FLIGHT_TX_TYPE_LABELS]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {ticket.clientName ? `${ticket.clientName} — ` : ""}
              {ticket.origin} → {ticket.destination}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isPosted && !isCancelled && !editing && (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate({ id })} disabled={cancelMutation.isPending}>
                <X className="mr-1 h-3.5 w-3.5" /> Cancel Ticket
              </Button>
              <Button size="sm" onClick={() => postMutation.mutate({ id })} disabled={postMutation.isPending}>
                <Send className="mr-1 h-3.5 w-3.5" /> Post & Create Journal
              </Button>
            </>
          )}
          {editing && <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Discard</Button>}
        </div>
      </div>

      {editing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Flight Details */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Flight Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="flightType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight Type</FormLabel>
                      <FormControl>
                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4 mt-1">
                          {[["ONE_WAY", "One Way"], ["RETURN", "Return"], ["MULTI_LEG", "Multiple Legs"]].map(([v, l]) => (
                            <div key={v} className="flex items-center gap-1.5">
                              <RadioGroupItem value={v} id={`edit-ft-${v}`} />
                              <Label htmlFor={`edit-ft-${v}`} className="cursor-pointer font-normal text-sm">{l}</Label>
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
                      <FormControl><Input placeholder="File ID or leave blank" {...field} /></FormControl>
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

                {watchedFlightType === "MULTI_LEG" ? (
                  <div className="space-y-2">
                    {legFields.map((legField, idx) => (
                      <div key={legField.id} className="flex items-end gap-2">
                        {idx === 0 ? (
                          <FC label="Client Name" className="w-36 shrink-0"><CompactInput name="clientName" control={form.control} placeholder="Client..." /></FC>
                        ) : (
                          <div className="w-36 shrink-0" />
                        )}
                        <div className="w-px self-stretch bg-border shrink-0" />
                        <FC label="Date" className="flex-1 min-w-0"><CompactInput name={`legs.${idx}.date`} control={form.control} type="date" /></FC>
                        <FC label="Origin" className="flex-1 min-w-0"><CompactInput name={`legs.${idx}.origin`} control={form.control} placeholder="CAI" /></FC>
                        <FC label="Destination" className="flex-1 min-w-0"><CompactInput name={`legs.${idx}.destination`} control={form.control} placeholder="LHR" /></FC>
                        <FC label="Flight No." className="flex-1 min-w-0"><CompactInput name={`legs.${idx}.flightNumber`} control={form.control} placeholder="MS777" /></FC>
                        <FC label="Time (24h)" className="flex-1 min-w-0"><CompactTime name={`legs.${idx}.takeOffTime`} control={form.control} /></FC>
                        <FC label="Terminal" className="flex-1 min-w-0"><CompactInput name={`legs.${idx}.terminal`} control={form.control} placeholder="T1" /></FC>
                        <FC label="Carrier" className="flex-1 min-w-0"><CompactInput name={`legs.${idx}.airline`} control={form.control} placeholder="EgyptAir" /></FC>
                        {idx === 0 ? (
                          <FC label="Ticket No." className="flex-1 min-w-0"><CompactInput name="ticketNumber" control={form.control} placeholder="077-..." /></FC>
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
                          <Button type="submit" size="icon" className="h-7 w-7 self-end shrink-0" disabled={updateMutation.isPending}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <FC label="Client Name" className={watchedFlightType === "RETURN" ? "w-36 shrink-0" : "flex-1 min-w-0"}>
                        <CompactInput name="clientName" control={form.control} placeholder="Client..." />
                      </FC>
                      {watchedFlightType === "RETURN" && <div className="w-px self-stretch bg-border shrink-0" />}
                      <FC label="Departure Date" className="flex-1 min-w-0"><CompactInput name="departureDate" control={form.control} type="date" /></FC>
                      <FC label="Origin" className="flex-1 min-w-0"><CompactInput name="origin" control={form.control} placeholder="CAI" /></FC>
                      <FC label="Destination" className="flex-1 min-w-0"><CompactInput name="destination" control={form.control} placeholder="LHR" /></FC>
                      <FC label="Flight No." className="flex-1 min-w-0"><CompactInput name="flightNumber" control={form.control} placeholder="MS777" /></FC>
                      <FC label="Time (24h)" className="flex-1 min-w-0"><CompactTime name="takeOffTime" control={form.control} /></FC>
                      <FC label="Terminal" className="flex-1 min-w-0"><CompactInput name="terminal" control={form.control} placeholder="T1" /></FC>
                      <FC label="Carrier" className="flex-1 min-w-0"><CompactInput name="airline" control={form.control} placeholder="EgyptAir" /></FC>
                      <FC label="Ticket No." className="flex-1 min-w-0"><CompactInput name="ticketNumber" control={form.control} placeholder="077-..." /></FC>
                      <Button type="submit" size="icon" className="h-7 w-7 self-end shrink-0" disabled={updateMutation.isPending}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {watchedFlightType === "RETURN" && (
                      <div className="flex items-end gap-2">
                        <div className="w-36 shrink-0" />
                        <div className="w-px shrink-0" />
                        <FC label="Return Date" className="flex-1 min-w-0"><CompactInput name="returnDate" control={form.control} type="date" /></FC>
                        <FC label="Origin" className="flex-1 min-w-0"><CompactInput name="destination" control={form.control} placeholder="LHR" /></FC>
                        <FC label="Destination" className="flex-1 min-w-0"><CompactInput name="origin" control={form.control} placeholder="CAI" /></FC>
                        <FC label="Return Flight No." className="flex-1 min-w-0"><CompactInput name="returnFlightNumber" control={form.control} placeholder="MS778" /></FC>
                        <FC label="Time (24h)" className="flex-1 min-w-0"><CompactTime name="returnTakeOffTime" control={form.control} /></FC>
                        <FC label="Terminal" className="flex-1 min-w-0"><CompactInput name="returnTerminal" control={form.control} placeholder="T1" /></FC>
                        <FC label="Carrier" className="flex-1 min-w-0"><CompactInput name="returnAirline" control={form.control} placeholder="EgyptAir" /></FC>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-5">

                {/* Links to Original Ticket */}
                <FormField control={form.control} name="parentTicketId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Links to Ticket (Original)</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="— None (independent ticket) —" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">— None (independent ticket) —</SelectItem>
                        {linkableTickets.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.code}{t.ticketNumber ? ` (${t.ticketNumber})` : ""} — {t.origin}→{t.destination}{t.clientName ? ` — ${t.clientName}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Link this transaction to the original issued ticket
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-4 gap-4">
                  <FormField control={form.control} name="currencyId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select currency..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          {currencies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

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
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {(watchedTxType === "REISSUE" || watchedTxType === "REVALIDATE") && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-md border">
                    <FormField control={form.control} name="changeFees" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Change Fees</FormLabel>
                        <div className="flex">
                          {selectedCurrencyCode && (
                            <span className="flex items-center px-2 bg-muted border border-r-0 rounded-l text-xs font-mono text-muted-foreground shrink-0">
                              {selectedCurrencyCode}
                            </span>
                          )}
                          <FormControl>
                            <Input type="number" min={0} step="0.01" placeholder="0.00"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              className={selectedCurrencyCode ? "rounded-l-none border-l-0" : ""} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="priceDifference" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Difference (+ or -)</FormLabel>
                        <div className="flex">
                          {selectedCurrencyCode && (
                            <span className="flex items-center px-2 bg-muted border border-r-0 rounded-l text-xs font-mono text-muted-foreground shrink-0">
                              {selectedCurrencyCode}
                            </span>
                          )}
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              className={selectedCurrencyCode ? "rounded-l-none border-l-0" : ""} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {watchedTxType === "REFUND" && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Refund:</strong> Vendor bill reversed (receivable). Customer invoice reversed (credit note). Cancellation fees deducted from refund.
                    </p>
                    <FormField control={form.control} name="cancellationFees" render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel>Cancellation Fees (charged to customer)</FormLabel>
                        <div className="flex">
                          {selectedCurrencyCode && (
                            <span className="flex items-center px-2 bg-muted border border-r-0 rounded-l text-xs font-mono text-muted-foreground shrink-0">
                              {selectedCurrencyCode}
                            </span>
                          )}
                          <FormControl>
                            <Input type="number" min={0} step="0.01" placeholder="0.00"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              className={selectedCurrencyCode ? "rounded-l-none border-l-0" : ""} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {watchedTxType === "VOID" && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Void:</strong> Vendor gives full free void. Charge customer an admin fee if applicable.
                    </p>
                    <FormField control={form.control} name="voidFee" render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel>Admin Fee (charged to customer)</FormLabel>
                        <div className="flex">
                          {selectedCurrencyCode && (
                            <span className="flex items-center px-2 bg-muted border border-r-0 rounded-l text-xs font-mono text-muted-foreground shrink-0">
                              {selectedCurrencyCode}
                            </span>
                          )}
                          <FormControl>
                            <Input type="number" min={0} step="0.01" placeholder="0.00"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              className={selectedCurrencyCode ? "rounded-l-none border-l-0" : ""} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* Fare Lines */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Fare Lines — Individual Pricing per Passenger / Class
                  </p>
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      <div className="grid gap-1 px-1 pb-1 border-b"
                        style={{ gridTemplateColumns: "100px 60px 115px 105px 70px 115px 70px 140px 70px 115px 70px 105px 80px 70px 32px" }}>
                        {["Pax / Label", "Class", `Base Fare${selectedCurrencyCode ? ` (${selectedCurrencyCode})` : ""}`, `Taxes${selectedCurrencyCode ? ` (${selectedCurrencyCode})` : ""}`, "Avia.%/$", `Avia.Val${selectedCurrencyCode ? ` (${selectedCurrencyCode})` : ""}`, "Avia.Disc", "Employee", "Emp.%/$", `Emp.Val${selectedCurrencyCode ? ` (${selectedCurrencyCode})` : ""}`, "Emp.Comm", `Sell Price${selectedCurrencyCode ? ` (${selectedCurrencyCode})` : ""}`, "Total Cost", "Profit", ""].map((h) => (
                          <span key={h} className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</span>
                        ))}
                      </div>
                      {fareLineFields.map((fl, idx) => (
                        <FareLineRow key={fl.id} index={idx} control={form.control} employees={employees}
                          onRemove={() => removeFareLine(idx)} canRemove={fareLineFields.length > 1}
                          currencyCode={selectedCurrencyCode} />
                      ))}
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1" onClick={() => appendFareLine(blankFareLine())}>
                    <Plus className="h-3 w-3" /> Add Fare Line
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-3 p-3 bg-muted/40 rounded-md border text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Cost{selectedCurrencyCode ? ` (${selectedCurrencyCode})` : ""}</p>
                    <p className="font-semibold text-red-600">{numFmt(aggTotals.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Revenue{selectedCurrencyCode ? ` (${selectedCurrencyCode})` : ""}</p>
                    <p className="font-semibold">{numFmt(aggTotals.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Profit{selectedCurrencyCode ? ` (${selectedCurrencyCode})` : ""}</p>
                    <p className={`font-semibold ${aggTotals.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{numFmt(aggTotals.profit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Margin %</p>
                    <p className={`font-semibold ${aggMargin >= 0 ? "text-green-600" : "text-red-600"}`}>{aggMargin.toFixed(2)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {/* Flight Details */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Flight Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Flight Type", OPS_FLIGHT_TYPE_LABELS[ticket.flightType]],
                  ["Client Name", ticket.clientName ?? "—"],
                  ["Issue Date", ticket.issueDate ? format(new Date(ticket.issueDate), "dd MMM yyyy") : "—"],
                  ["Ticket #", ticket.ticketNumber ?? "—"],
                  ["Origin", ticket.origin],
                  ["Destination", ticket.destination],
                  ["Departure", format(new Date(ticket.departureDate), "dd MMM yyyy")],
                  ["Take Off Time", ticket.takeOffTime ?? "—"],
                  ["Terminal", ticket.terminal ?? "—"],
                  ["Airline", ticket.airline ?? "—"],
                  ["Flight #", ticket.flightNumber ?? "—"],
                  ...(ticket.returnDate ? [
                    ["Return Date", format(new Date(ticket.returnDate), "dd MMM yyyy")],
                    ["Return Time", tkt.returnTakeOffTime ?? "—"],
                    ["Return Terminal", tkt.returnTerminal ?? "—"],
                    ["Return Airline", tkt.returnAirline ?? "—"],
                    ["Return Flight #", ticket.returnFlightNumber ?? "—"],
                  ] : []),
                  ["Linked File", ticket.opsFile ? ticket.opsFile.code : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {tkt.parentTicket && (
                  <div className="flex justify-between p-2 bg-muted/40 rounded text-xs">
                    <span className="text-muted-foreground">Original Ticket</span>
                    <Link href={`/tour-ops/flight-tickets/${tkt.parentTicket.id}`} className="font-mono font-medium text-primary hover:underline">
                      {tkt.parentTicket.code}{tkt.parentTicket.ticketNumber ? ` (${tkt.parentTicket.ticketNumber})` : ""}
                    </Link>
                  </div>
                )}
                {tkt.derivedTickets?.length > 0 && (
                  <div className="p-2 bg-muted/40 rounded text-xs space-y-0.5">
                    <p className="text-muted-foreground mb-1">Derived Transactions</p>
                    {tkt.derivedTickets.map((d: any) => (
                      <div key={d.id} className="flex justify-between">
                        <Link href={`/tour-ops/flight-tickets/${d.id}`} className="font-mono font-medium text-primary hover:underline">
                          {d.code}
                        </Link>
                        <span className="text-muted-foreground">{OPS_FLIGHT_TX_TYPE_LABELS[(d.transactionType ?? "ISSUE") as keyof typeof OPS_FLIGHT_TX_TYPE_LABELS]}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-1.5">
                  {[
                    ["Currency", tkt.currency?.code ? `${tkt.currency.code} — ${tkt.currency.name ?? ""}` : "—"],
                    ["Transaction", OPS_FLIGHT_TX_TYPE_LABELS[(tkt.transactionType ?? "ISSUE") as keyof typeof OPS_FLIGHT_TX_TYPE_LABELS]],
                    ["Vendor", tkt.vendor?.name ?? "—"],
                    ["Customer", tkt.customerPartner?.name ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
                {(tkt.changeFees || tkt.priceDifference) && (
                  <div className="border-t pt-1.5 space-y-1">
                    {tkt.changeFees && <div className="flex justify-between"><span className="text-muted-foreground">Change Fees</span><span>{numFmt(Number(tkt.changeFees))}</span></div>}
                    {tkt.priceDifference !== null && tkt.priceDifference !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price Difference</span>
                        <span className={Number(tkt.priceDifference) >= 0 ? "text-green-600" : "text-red-600"}>{numFmt(Number(tkt.priceDifference))}</span>
                      </div>
                    )}
                  </div>
                )}
                {tkt.cancellationFees && (
                  <div className="border-t pt-1.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Cancellation Fees</span><span className="text-red-600">{numFmt(Number(tkt.cancellationFees))}</span></div>
                  </div>
                )}
                {tkt.voidFee && (
                  <div className="border-t pt-1.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Void Admin Fee</span><span>{numFmt(Number(tkt.voidFee))}</span></div>
                  </div>
                )}
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Revenue</span><span className="font-medium">{tkt.currency?.code ? <span className="text-[10px] text-muted-foreground mr-1 font-mono">{tkt.currency.code}</span> : null}{numFmt(revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Cost</span><span className="text-red-600">{tkt.currency?.code ? <span className="text-[10px] text-muted-foreground mr-1 font-mono">{tkt.currency.code}</span> : null}{numFmt(cost)}</span></div>
                  <div className="flex justify-between font-semibold">
                    <span>Profit</span>
                    <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>{tkt.currency?.code ? <span className="text-[10px] text-muted-foreground mr-1 font-mono">{tkt.currency.code}</span> : null}{numFmt(profit)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Margin</span>
                    <span className={marginPct >= 0 ? "text-green-600" : "text-red-600"}>{marginPct.toFixed(2)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fare Lines */}
          {tkt.fareLines?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Fare Lines</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        {["Pax / Label", "Class", `Base Fare${tkt.currency?.code ? ` (${tkt.currency.code})` : ""}`, `Taxes${tkt.currency?.code ? ` (${tkt.currency.code})` : ""}`, "Avia.Comm", "Employee", "Emp.Comm", `Sell Price${tkt.currency?.code ? ` (${tkt.currency.code})` : ""}`, `Total Cost${tkt.currency?.code ? ` (${tkt.currency.code})` : ""}`, `Profit${tkt.currency?.code ? ` (${tkt.currency.code})` : ""}`, "Margin"].map((h) => (
                          <th key={h} className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wide text-[9px] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tkt.fareLines.map((fl: any) => {
                        const p = Number(fl.profit);
                        const m = Number(fl.marginPct);
                        return (
                          <PermissionGuard permission="tour-ops:flightTicket:read">
                            <tr key={fl.id} className="border-b last:border-b-0">
                            <td className="py-1.5 pr-3">{fl.passengerLabel || "—"}</td>
                            <td className="py-1.5 pr-3">{fl.classCode || "—"}</td>
                            <td className="py-1.5 pr-3">{numFmt(Number(fl.baseFare))}</td>
                            <td className="py-1.5 pr-3">{numFmt(Number(fl.taxes))}</td>
                            <td className="py-1.5 pr-3 text-green-600">
                              {fl.aviationCommType === "PERCENTAGE" ? `${Number(fl.aviationCommValue)}%` : "$"} → -{numFmt(Number(fl.aviationCommAmount))}
                            </td>
                            <td className="py-1.5 pr-3">{fl.employee?.name ?? "—"}</td>
                            <td className="py-1.5 pr-3 text-orange-600">
                              {fl.empCommType === "PERCENTAGE" ? `${Number(fl.empCommValue)}%` : "$"} → +{numFmt(Number(fl.empCommAmount))}
                            </td>
                            <td className="py-1.5 pr-3">{numFmt(Number(fl.sellingPrice))}</td>
                            <td className="py-1.5 pr-3 text-red-600 font-medium">{numFmt(Number(fl.totalCost))}</td>
                            <td className={`py-1.5 pr-3 font-medium ${p >= 0 ? "text-green-600" : "text-red-600"}`}>{numFmt(p)}</td>
                            <td className={`py-1.5 pr-3 font-medium ${m >= 0 ? "text-green-600" : "text-red-600"}`}>{m.toFixed(2)}%</td>
                          </tr>
                          </PermissionGuard>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accounting Moves */}
          {(tkt.vendorMove || tkt.customerMove || isPosted) && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Accounting</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {tkt.vendorMove && (
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div>
                      <p className="font-medium text-xs">Vendor Bill</p>
                      <p className="text-muted-foreground text-xs">{tkt.vendorMove.name ?? tkt.vendorMove.id} — {tkt.vendorMove.state}</p>
                    </div>
                    <span className="font-semibold">{numFmt(Number(tkt.vendorMove.amountTotal))}</span>
                  </div>
                )}
                {tkt.customerMove && (
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div>
                      <p className="font-medium text-xs">Customer Invoice</p>
                      <p className="text-muted-foreground text-xs">{tkt.customerMove.name ?? tkt.customerMove.id} — {tkt.customerMove.state}</p>
                    </div>
                    <span className="font-semibold">{numFmt(Number(tkt.customerMove.amountTotal))}</span>
                  </div>
                )}
                {isPosted && ticket.journalMoveId && (
                  <p className="text-xs text-muted-foreground">P&L Journal Entry: <span className="font-mono">{ticket.journalMoveId}</span></p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Multi-leg legs display */}
          {ticket.flightType === "MULTI_LEG" && ticket.legs && ticket.legs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Flight Legs</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(ticket.legs as any[]).map((leg, idx) => (
                  <div key={leg.id} className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leg {idx + 1}</p>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-medium">{leg.origin} → {leg.destination}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(leg.date), "dd MMM yyyy")}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{leg.takeOffTime ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Terminal</span><span>{leg.terminal ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Airline</span><span>{leg.airline ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Flight #</span><span>{leg.flightNumber ?? "—"}</span></div>
                    </div>
                    {idx < ticket.legs!.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {ticket.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-line">{ticket.notes}</p></CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
