"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cruiseBookingCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

type FormValues = z.input<typeof cruiseBookingCreateSchema>;

function NewBookingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const departureId = params.get("departureId") ?? undefined;

  const { data: departures } = trpc.nileCruises.departure.list.useQuery({ status: "OPEN" });

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
      departureId: departureId ?? "",
      leadGuestName: "",
      adults: 2,
      children: 0,
      infants: 0,
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Cruise Booking</h1>
        <p className="text-sm text-muted-foreground">Create a cruise reservation</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Departure & Guests</CardTitle></CardHeader>
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
              <FormField control={form.control} name="leadGuestName" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Lead Guest Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. John Smith" {...field} /></FormControl>
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
            <Button type="submit" disabled={create.isPending}>
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
