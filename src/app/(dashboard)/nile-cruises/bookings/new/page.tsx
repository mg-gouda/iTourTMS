"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Suspense, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cruiseBookingCreateSchema } from "@/lib/validations/nile-cruises";
import { CRUISE_BOOKING_SOURCE_LABELS, CRUISE_BILLING_TYPE_LABELS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

type FormValues = z.input<typeof cruiseBookingCreateSchema>;

const SOURCE_OPTIONS = ["DIRECT", "CRM", "TOUR_OPS", "B2C_WEBSITE", "B2B_PORTAL", "TOUR_OPERATOR"] as const;
const BILLING_OPTIONS = ["GUEST_DIRECT", "TOUR_OPERATOR", "TRAVEL_AGENT"] as const;

function NewBookingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const departureId = params.get("departureId") ?? "";

  const { data: departures } = trpc.nileCruises.departure.list.useQuery({});

  const create = trpc.nileCruises.booking.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking ${data.code} created`);
      router.push(`/nile-cruises/bookings/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseBookingCreateSchema),
    defaultValues: {
      departureId: departureId,
      contractId: "",
      leadGuestName: "",
      adults: 2,
      children: 0,
      infants: 0,
      cabinCount: 1,
      source: "DIRECT",
      billingType: "GUEST_DIRECT",
      baseCurrency: "USD",
      netTotal: 0,
      markup: 0,
      discounts: 0,
      galaSupplement: 0,
      grossTotal: 0,
      balanceDue: 0,
    },
  });

  const selectedDepartureId = form.watch("departureId");
  const netTotal = form.watch("netTotal") ?? 0;
  const markupPct = form.watch("markup") ?? 0;
  const discounts = form.watch("discounts") ?? 0;

  // Auto-populate contractId from selected departure
  useEffect(() => {
    if (!selectedDepartureId || !departures) return;
    const dep = departures.find((d) => d.id === selectedDepartureId);
    if (dep?.contract?.id) {
      form.setValue("contractId", dep.contract.id);
    }
  }, [selectedDepartureId, departures, form]);

  // Auto-compute grossTotal and balanceDue
  useEffect(() => {
    const gross = Math.max(0, netTotal * (1 + markupPct / 100) - discounts);
    form.setValue("grossTotal", Math.round(gross * 100) / 100);
    form.setValue("balanceDue", Math.round(gross * 100) / 100);
  }, [netTotal, markupPct, discounts, form]);

  const selectedDeparture = departures?.find((d) => d.id === selectedDepartureId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Cruise Booking</h1>
        <p className="text-sm text-muted-foreground">Create a cruise reservation</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
          {/* Departure */}
          <Card>
            <CardHeader><CardTitle className="text-base">Departure</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="departureId" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Departure *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a departure" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {departures?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.code} · {d.boat.name} · {new Date(d.embarkDate).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {selectedDeparture?.contract && (
                <div className="sm:col-span-2 rounded bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Contract: </span>
                  <span className="font-medium">{selectedDeparture.contract.code} — {selectedDeparture.contract.name}</span>
                </div>
              )}
              {selectedDepartureId && !selectedDeparture?.contract && (
                <div className="sm:col-span-2 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  This departure has no linked contract. Attach a contract before booking.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guest */}
          <Card>
            <CardHeader><CardTitle className="text-base">Lead Guest & Pax</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="leadGuestName" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Lead Guest Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Smith, John" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="leadGuestEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="guest@example.com" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="leadGuestPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+1 555-0100" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="adults" render={({ field }) => (
                <FormItem>
                  <FormLabel>Adults *</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cabinCount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cabins</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="children" render={({ field }) => (
                <FormItem>
                  <FormLabel>Children</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="infants" render={({ field }) => (
                <FormItem>
                  <FormLabel>Infants</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="baseCurrency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["USD","EUR","GBP","EGP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="netTotal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Net Total *</FormLabel>
                  <FormControl><Input type="number" min={0} step={0.01} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="markup" render={({ field }) => (
                <FormItem>
                  <FormLabel>Markup %</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} step={0.1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="discounts" render={({ field }) => (
                <FormItem>
                  <FormLabel>Discounts</FormLabel>
                  <FormControl><Input type="number" min={0} step={0.01} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="grossTotal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gross Total</FormLabel>
                  <FormControl><Input type="number" min={0} step={0.01} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="galaSupplement" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gala Supplement</FormLabel>
                  <FormControl><Input type="number" min={0} step={0.01} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Source / Billing */}
          <Card>
            <CardHeader><CardTitle className="text-base">Source & Billing</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Source</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{CRUISE_BOOKING_SOURCE_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="billingType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BILLING_OPTIONS.map((b) => <SelectItem key={b} value={b}>{CRUISE_BILLING_TYPE_LABELS[b]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Input placeholder="Any special notes..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !form.watch("contractId")}>
              {create.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function NewCruiseBookingPage() {
  return (
    <Suspense>
      <NewBookingForm />
    </Suspense>
  );
}
