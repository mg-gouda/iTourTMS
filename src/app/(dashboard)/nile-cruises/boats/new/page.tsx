"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cruiseBoatCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";

type FormValues = z.input<typeof cruiseBoatCreateSchema>;

export default function NewCruiseBoatPage() {
  const router = useRouter();
  const create = trpc.nileCruises.boat.create.useMutation({
    onSuccess: (data) => {
      toast.success("Boat created successfully");
      router.push(`/nile-cruises/boats/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseBoatCreateSchema),
    defaultValues: {
      name: "",
      code: "",
      ownershipMode: "OWN_FLEET",
      boatClass: "STEAMER",
      starRating: "FIVE",
      totalCabins: 20,
      totalDecks: 3,
      maxPax: 40,
      active: true,
      homePortCode: "LUXOR",
      hasPool: false,
      hasSpa: false,
      hasGym: false,
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Add New Boat</h1>
        <p className="text-sm text-muted-foreground">Register a cruise vessel to your fleet</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Boat Name *</FormLabel>
                  <FormControl><Input placeholder="MS Nile Dream" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl><Input placeholder="MS-ND" className="font-mono" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ownershipMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ownership *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="OWN_FLEET">Own Fleet</SelectItem>
                      <SelectItem value="CONTRACTED">Contracted</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="boatClass" render={({ field }) => (
                <FormItem>
                  <FormLabel>Class *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="STEAMER">Cruise Ship</SelectItem>
                      <SelectItem value="DAHABIYA">Dahabiya</SelectItem>
                      <SelectItem value="LAKE_CRUISER">Lake Cruiser</SelectItem>
                      <SelectItem value="LONG_NILE_CRUISER">Long Nile Cruiser</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="starRating" render={({ field }) => (
                <FormItem>
                  <FormLabel>Star Rating *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="THREE">3 Stars</SelectItem>
                      <SelectItem value="FOUR">4 Stars</SelectItem>
                      <SelectItem value="FIVE">5 Stars</SelectItem>
                      <SelectItem value="FIVE_DELUXE">5 Stars Deluxe</SelectItem>
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
              <FormField control={form.control} name="totalDecks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Decks *</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="maxPax" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Passengers *</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="homePortCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Port *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["LUXOR","ASWAN","ESNA","EDFU","KOM_OMBO","ABU_SIMBEL","CAIRO","OTHER"].map((p) => (
                        <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="yearBuilt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year Built</FormLabel>
                  <FormControl><Input type="number" placeholder="2010" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="yearRenovated" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year Renovated</FormLabel>
                  <FormControl><Input type="number" placeholder="2020" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Boat"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
