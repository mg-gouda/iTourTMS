"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, Pencil, Plus, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useFieldArray, useForm, useController } from "react-hook-form";
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
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";

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
  pricingBasis: z.enum(["PER_PERSON", "BULK"]),
  pax: z.number().int().min(1),
  buyingRate: z.number().min(0),
  sellingRate: z.number().min(0),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]),
  commissionValue: z.number().min(0),
  notes: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

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

function CompactInput({
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
    <Input
      {...field}
      type={type}
      placeholder={placeholder}
      className="h-7 text-xs px-1.5"
    />
  );
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
        if (v.length === 2 && !v.includes(":") && (field.value ?? "").length < 2) {
          field.onChange(v + ":");
        } else {
          field.onChange(v);
        }
      }}
      className="h-7 text-xs px-1.5"
    />
  );
}

export default function FlightTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const { data: ticket, isLoading } = trpc.tourOps.flightTicket.getById.useQuery({ id });

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
      opsFileId: "",
      clientName: "",
      issueDate: "",
      flightType: "ONE_WAY",
      origin: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      takeOffTime: "",
      airline: "",
      flightNumber: "",
      terminal: "",
      returnFlightNumber: "",
      returnTakeOffTime: "",
      returnTerminal: "",
      returnAirline: "",
      ticketNumber: "",
      legs: [],
      pricingBasis: "PER_PERSON",
      pax: 1,
      buyingRate: 0,
      sellingRate: 0,
      commissionType: "PERCENTAGE",
      commissionValue: 0,
      notes: "",
    },
  });

  const { fields: legFields, append: appendLeg, remove: removeLeg } = useFieldArray({
    control: form.control,
    name: "legs",
  });

  function startEdit() {
    if (!ticket) return;
    form.reset({
      opsFileId: ticket.opsFileId ?? "",
      clientName: ticket.clientName ?? "",
      issueDate: ticket.issueDate ? ticket.issueDate.toString().split("T")[0] : "",
      flightType: ticket.flightType as "ONE_WAY" | "RETURN" | "MULTI_LEG",
      origin: ticket.origin,
      destination: ticket.destination,
      departureDate: ticket.departureDate.toString().split("T")[0],
      returnDate: ticket.returnDate ? ticket.returnDate.toString().split("T")[0] : "",
      takeOffTime: ticket.takeOffTime ?? "",
      airline: ticket.airline ?? "",
      flightNumber: ticket.flightNumber ?? "",
      terminal: ticket.terminal ?? "",
      returnFlightNumber: ticket.returnFlightNumber ?? "",
      returnTakeOffTime: (ticket as any).returnTakeOffTime ?? "",
      returnTerminal: (ticket as any).returnTerminal ?? "",
      returnAirline: (ticket as any).returnAirline ?? "",
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
      pricingBasis: ticket.pricingBasis,
      pax: ticket.pax,
      buyingRate: Number(ticket.buyingRate),
      sellingRate: Number(ticket.sellingRate),
      commissionType: ticket.commissionType,
      commissionValue: Number(ticket.commissionValue),
      notes: ticket.notes ?? "",
    });
    setEditing(true);
  }

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
        legs: values.flightType === "MULTI_LEG" ? values.legs : [],
      },
    });
  }

  const watchedPax = form.watch("pax") || 1;
  const watchedBuying = form.watch("buyingRate") || 0;
  const watchedSelling = form.watch("sellingRate") || 0;
  const watchedCommValue = form.watch("commissionValue") || 0;
  const watchedPricingBasis = form.watch("pricingBasis");
  const watchedCommType = form.watch("commissionType");
  const watchedFlightType = form.watch("flightType");
  const editMult = watchedPricingBasis === "PER_PERSON" ? watchedPax : 1;
  const editTotalBuying = watchedBuying * editMult;
  const editTotalRevenue = watchedSelling * editMult;
  const editComm =
    watchedCommType === "PERCENTAGE"
      ? (editTotalBuying * watchedCommValue) / 100
      : watchedCommValue;
  const editTotalCost = editTotalBuying + editComm;
  const editProfit = editTotalRevenue - editTotalCost;
  const editMarginPct = editTotalCost > 0 ? (editProfit / editTotalCost) * 100 : 0;

  if (isLoading)
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  if (!ticket) return <div className="p-6 text-sm">Ticket not found.</div>;

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
            <Link href="/tour-ops/flight-tickets">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold font-mono">{ticket.code}</h1>
              <Badge
                variant={
                  OPS_FLIGHT_TICKET_STATUS_VARIANTS[ticket.status] as
                    | "default"
                    | "secondary"
                    | "destructive"
                    | "outline"
                }
              >
                {OPS_FLIGHT_TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant="outline">{OPS_FLIGHT_TYPE_LABELS[ticket.flightType]}</Badge>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelMutation.mutate({ id })}
                disabled={cancelMutation.isPending}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Cancel Ticket
              </Button>
              <Button
                size="sm"
                onClick={() => postMutation.mutate({ id })}
                disabled={postMutation.isPending}
              >
                <Send className="mr-1 h-3.5 w-3.5" /> Post & Create Journal
              </Button>
            </>
          )}
          {editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Discard
            </Button>
          )}
        </div>
      </div>

      {editing ? (
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
                                <RadioGroupItem value={v} id={`edit-ft-${v}`} />
                                <Label htmlFor={`edit-ft-${v}`} className="cursor-pointer font-normal text-sm">{l}</Label>
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

                {/* Row 3+: Compact inline flight rows */}
                {watchedFlightType === "MULTI_LEG" ? (
                  <div className="space-y-2">
                    {legFields.map((legField, idx) => (
                      <div key={legField.id} className="flex items-end gap-2">
                        {/* Client Name fixed column — only on first leg, spacer on rest */}
                        {idx === 0 ? (
                          <FC label="Client Name" className="w-36 shrink-0">
                            <CompactInput name="clientName" control={form.control} placeholder="Client..." />
                          </FC>
                        ) : (
                          <div className="w-36 shrink-0" />
                        )}

                        <div className="w-px self-stretch bg-border shrink-0" />

                        <FC label="Date" className="flex-1 min-w-0">
                          <CompactInput name={`legs.${idx}.date`} control={form.control} type="date" />
                        </FC>

                        <FC label="Origin" className="flex-1 min-w-0">
                          <CompactInput name={`legs.${idx}.origin`} control={form.control} placeholder="CAI" />
                        </FC>

                        <FC label="Destination" className="flex-1 min-w-0">
                          <CompactInput name={`legs.${idx}.destination`} control={form.control} placeholder="LHR" />
                        </FC>

                        <FC label="Flight No." className="flex-1 min-w-0">
                          <CompactInput name={`legs.${idx}.flightNumber`} control={form.control} placeholder="MS777" />
                        </FC>

                        <FC label="Time (24h)" className="flex-1 min-w-0">
                          <CompactTime name={`legs.${idx}.takeOffTime`} control={form.control} />
                        </FC>

                        <FC label="Terminal" className="flex-1 min-w-0">
                          <CompactInput name={`legs.${idx}.terminal`} control={form.control} placeholder="T1" />
                        </FC>

                        <FC label="Carrier" className="flex-1 min-w-0">
                          <CompactInput name={`legs.${idx}.airline`} control={form.control} placeholder="EgyptAir" />
                        </FC>

                        {/* Ticket No. on first leg, spacer on rest */}
                        {idx === 0 ? (
                          <FC label="Ticket No." className="flex-1 min-w-0">
                            <CompactInput name="ticketNumber" control={form.control} placeholder="077-..." />
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
                              appendLeg({
                                sequence: legFields.length + 1,
                                origin: "",
                                destination: "",
                                date: "",
                                takeOffTime: "",
                                airline: "",
                                flightNumber: "",
                                terminal: "",
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {idx >= 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 self-end shrink-0"
                            onClick={() => removeLeg(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}

                        {idx === legFields.length - 1 && (
                          <Button
                            type="submit"
                            size="icon"
                            className="h-7 w-7 self-end shrink-0"
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Row 3: Outbound */}
                    <div className="flex items-end gap-2">
                      {/* Client Name: fixed column for RETURN, flex for ONE_WAY */}
                      <FC
                        label="Client Name"
                        className={watchedFlightType === "RETURN" ? "w-36 shrink-0" : "flex-1 min-w-0"}
                      >
                        <CompactInput name="clientName" control={form.control} placeholder="Client..." />
                      </FC>

                      {watchedFlightType === "RETURN" && (
                        <div className="w-px self-stretch bg-border shrink-0" />
                      )}

                      <FC label="Departure Date" className="flex-1 min-w-0">
                        <CompactInput name="departureDate" control={form.control} type="date" />
                      </FC>

                      <FC label="Origin" className="flex-1 min-w-0">
                        <CompactInput name="origin" control={form.control} placeholder="CAI" />
                      </FC>

                      <FC label="Destination" className="flex-1 min-w-0">
                        <CompactInput name="destination" control={form.control} placeholder="LHR" />
                      </FC>

                      <FC label="Flight No." className="flex-1 min-w-0">
                        <CompactInput name="flightNumber" control={form.control} placeholder="MS777" />
                      </FC>

                      <FC label="Time (24h)" className="flex-1 min-w-0">
                        <CompactTime name="takeOffTime" control={form.control} />
                      </FC>

                      <FC label="Terminal" className="flex-1 min-w-0">
                        <CompactInput name="terminal" control={form.control} placeholder="T1" />
                      </FC>

                      <FC label="Carrier" className="flex-1 min-w-0">
                        <CompactInput name="airline" control={form.control} placeholder="EgyptAir" />
                      </FC>

                      <FC label="Ticket No." className="flex-1 min-w-0">
                        <CompactInput name="ticketNumber" control={form.control} placeholder="077-..." />
                      </FC>

                      <Button
                        type="submit"
                        size="icon"
                        className="h-7 w-7 self-end shrink-0"
                        disabled={updateMutation.isPending}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Row 4: Return leg — spacer aligns Return Date under Departure Date */}
                    {watchedFlightType === "RETURN" && (
                      <div className="flex items-end gap-2">
                        <div className="w-36 shrink-0" />
                        <div className="w-px shrink-0" />

                        <FC label="Return Date" className="flex-1 min-w-0">
                          <CompactInput name="returnDate" control={form.control} type="date" />
                        </FC>

                        <FC label="Origin" className="flex-1 min-w-0">
                          <CompactInput name="destination" control={form.control} placeholder="LHR" />
                        </FC>

                        <FC label="Destination" className="flex-1 min-w-0">
                          <CompactInput name="origin" control={form.control} placeholder="CAI" />
                        </FC>

                        <FC label="Return Flight No." className="flex-1 min-w-0">
                          <CompactInput name="returnFlightNumber" control={form.control} placeholder="MS778" />
                        </FC>

                        <FC label="Time (24h)" className="flex-1 min-w-0">
                          <CompactTime name="returnTakeOffTime" control={form.control} />
                        </FC>

                        <FC label="Terminal" className="flex-1 min-w-0">
                          <CompactInput name="returnTerminal" control={form.control} placeholder="T1" />
                        </FC>

                        <FC label="Carrier" className="flex-1 min-w-0">
                          <CompactInput name="returnAirline" control={form.control} placeholder="EgyptAir" />
                        </FC>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricingBasis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Basis</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PER_PERSON">Per Person</SelectItem>
                          <SelectItem value="BULK">Bulk</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedPricingBasis === "PER_PERSON" && (
                  <FormField
                    control={form.control}
                    name="pax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pax</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="buyingRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buying Rate (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sellingRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Rate (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commissionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                          <SelectItem value="FIXED">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commissionValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchedCommType === "PERCENTAGE" ? "Commission %" : "Commission Amount (USD)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">P&amp;L Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-medium">${editTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission</span>
                    <span className="text-orange-600">${editComm.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="text-red-600">${editTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit</span>
                    <span className={`font-semibold ${editProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${editProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margin %</span>
                    <span className={`font-semibold ${editMarginPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {editMarginPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Flight Details</CardTitle>
              </CardHeader>
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
                  ...(ticket.returnDate
                    ? [
                        ["Return Date", format(new Date(ticket.returnDate), "dd MMM yyyy")],
                        ["Return Time", (ticket as any).returnTakeOffTime ?? "—"],
                        ["Return Terminal", (ticket as any).returnTerminal ?? "—"],
                        ["Return Airline", (ticket as any).returnAirline ?? "—"],
                        ["Return Flight #", ticket.returnFlightNumber ?? "—"],
                      ]
                    : []),
                  ["Linked File", ticket.opsFile ? ticket.opsFile.code : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Pricing Basis", OPS_PRICING_BASIS_LABELS[ticket.pricingBasis]],
                  ["Pax", String(ticket.pax)],
                  ["Buying Rate", `$${Number(ticket.buyingRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                  ["Selling Rate", `$${Number(ticket.sellingRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                  ["Commission Type", OPS_MARKUP_TYPE_LABELS[ticket.commissionType]],
                  [
                    "Commission Value",
                    ticket.commissionType === "PERCENTAGE"
                      ? `${Number(ticket.commissionValue)}%`
                      : `$${Number(ticket.commissionValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  ],
                  ["Commission Amount", `$${Number(ticket.commissionAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Multi-leg legs display */}
          {ticket.flightType === "MULTI_LEG" && ticket.legs && ticket.legs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Flight Legs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(ticket.legs as any[]).map((leg, idx) => (
                  <div key={leg.id} className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Leg {idx + 1}
                    </p>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Route</span>
                        <span className="font-medium">
                          {leg.origin} → {leg.destination}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span>{format(new Date(leg.date), "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span>{leg.takeOffTime ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Terminal</span>
                        <span>{leg.terminal ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Airline</span>
                        <span>{leg.airline ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flight #</span>
                        <span>{leg.flightNumber ?? "—"}</span>
                      </div>
                    </div>
                    {idx < ticket.legs!.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">P&amp;L Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Total Revenue</span>
                  <span className="font-medium">${revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Total Cost (incl. commission)</span>
                  <span className="text-red-600">${cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Profit</span>
                  <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                    ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Margin</span>
                  <span className={marginPct >= 0 ? "text-green-600" : "text-red-600"}>
                    {marginPct.toFixed(2)}%
                  </span>
                </div>
              </div>
              {isPosted && ticket.journalMoveId && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Journal entry posted — Move ID:{" "}
                  <span className="font-mono">{ticket.journalMoveId}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {ticket.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{ticket.notes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
