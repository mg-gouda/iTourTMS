"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRUISE_PORT_LABELS } from "@/lib/constants/nile-cruises";
import { cruiseDepartureCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

const PORT_OPTIONS = [
  "LUXOR","ASWAN","ESNA","EDFU","KOM_OMBO","ABU_SIMBEL","CAIRO",
  "EL_MINYA","ASYUT","SOHAG","QENA","DENDERA","ABYDOS",
  "WADI_EL_SEBOUA","AMADA","KASR_IBRIM","OTHER",
] as const;

type FormValues = z.input<typeof cruiseDepartureCreateSchema>;

export default function NewCruiseDeparturePage() {
  const router = useRouter();
  const { data: boats } = trpc.nileCruises.boat.list.useQuery();
  const { data: cruiseTypes } = trpc.nileCruises.cruiseType.list.useQuery();

  const create = trpc.nileCruises.departure.create.useMutation({
    onSuccess: (data) => {
      toast.success("Departure created");
      router.push(`/nile-cruises/departures/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseDepartureCreateSchema),
    defaultValues: {
      embarkDate: "",
      disembarkDate: "",
      embarkPort: "LUXOR",
      disembarkPort: "ASWAN",
      totalCabins: 32,
      totalPaxCapacity: 64,
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Departure</h1>
        <p className="text-sm text-muted-foreground">Schedule a new cruise sailing</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Departure Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="boatId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Boat *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select boat" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {boats?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cruiseTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cruise Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {cruiseTypes?.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="embarkDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Embark Date *</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="disembarkDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Disembark Date *</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="embarkPort" render={({ field }) => (
                <FormItem>
                  <FormLabel>Embark Port *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PORT_OPTIONS.map((p) => <SelectItem key={p} value={p}>{CRUISE_PORT_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="disembarkPort" render={({ field }) => (
                <FormItem>
                  <FormLabel>Disembark Port *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PORT_OPTIONS.map((p) => <SelectItem key={p} value={p}>{CRUISE_PORT_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="totalCabins" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Cabins *</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="totalPaxCapacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pax Capacity *</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Input placeholder="Any operational notes..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Departure"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
