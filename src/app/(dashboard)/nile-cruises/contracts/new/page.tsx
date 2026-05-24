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
import { cruiseContractCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EGP", label: "EGP — Egyptian Pound" },
];

type FormValues = z.input<typeof cruiseContractCreateSchema>;

export default function NewCruiseContractPage() {
  const router = useRouter();
  const { data: boats } = trpc.nileCruises.boat.list.useQuery();

  const create = trpc.nileCruises.contract.create.useMutation({
    onSuccess: (data) => {
      toast.success("Contract created");
      router.push(`/nile-cruises/contracts/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseContractCreateSchema),
    defaultValues: {
      name: "",
      baseCurrency: "USD",
      ownershipMode: "OWN_FLEET",
      validFrom: "",
      validTo: "",
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Cruise Contract</h1>
        <p className="text-sm text-muted-foreground">Create a rate agreement for a cruise boat</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Contract Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Contract Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. MS Nile Dream 2025 Season" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="boatId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Boat *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a boat" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {boats?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ownershipMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ownership Mode *</FormLabel>
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
              <FormField control={form.control} name="baseCurrency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Currency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="validFrom" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid From *</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="validTo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid To *</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Contract"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
