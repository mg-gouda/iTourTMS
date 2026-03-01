"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TT_VEHICLE_OWNERSHIP_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";
import { vehicleCreateSchema } from "@/lib/validations/traffic";

type FormValues = z.input<typeof vehicleCreateSchema>;

export default function NewVehiclePage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(vehicleCreateSchema),
    defaultValues: { ownership: "OWNED", status: "ACTIVE", isActive: true },
  });

  const { data: vehicleTypes } = trpc.traffic.vehicleType.list.useQuery();

  const createMutation = trpc.traffic.vehicle.create.useMutation({
    onSuccess: (data) => {
      toast.success("Vehicle created");
      utils.traffic.vehicle.invalidate();
      router.push(`/traffic/vehicles/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="text-2xl font-bold">New Vehicle</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Vehicle Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="vehicleTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {vehicleTypes?.map((vt) => <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="plateNumber" render={({ field }) => (
                <FormItem><FormLabel>Plate Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ownership" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ownership</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(TT_VEHICLE_OWNERSHIP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="sm:col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Vehicle"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
