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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { driverCreateSchema } from "@/lib/validations/traffic";

type FormValues = z.input<typeof driverCreateSchema>;

export default function NewDriverPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({ resolver: zodResolver(driverCreateSchema), defaultValues: { status: "ACTIVE", isActive: true } });

  const { data: users } = trpc.traffic.driver.listCompanyUsers.useQuery();
  const createMutation = trpc.traffic.driver.create.useMutation({
    onSuccess: (data) => { toast.success("Driver created"); utils.traffic.driver.invalidate(); router.push(`/traffic/drivers/${data.id}`); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">New Driver</h1></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Driver Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem>
                  <FormLabel>User Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                <FormItem><FormLabel>License Number</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="licenseExpiry" render={({ field }) => (
                <FormItem><FormLabel>License Expiry</FormLabel><FormControl><Input type="date" onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Driver"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
