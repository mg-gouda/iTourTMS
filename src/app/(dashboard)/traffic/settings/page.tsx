"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ttSettingsUpdateSchema } from "@/lib/validations/traffic";

type FormValues = z.input<typeof ttSettingsUpdateSchema>;

export default function TrafficSettingsPage() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.traffic.settings.get.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(ttSettingsUpdateSchema),
    values: settings ? {
      dispatchLockHours: settings.dispatchLockHours,
      enableDriverPortal: settings.enableDriverPortal,
      enableRepPortal: settings.enableRepPortal,
      enableSupplierPortal: settings.enableSupplierPortal,
      enableGuestBookings: settings.enableGuestBookings,
      whatsappEnabled: settings.whatsappEnabled,
      pushEnabled: settings.pushEnabled,
    } : undefined,
  });

  const updateMutation = trpc.traffic.settings.update.useMutation({
    onSuccess: () => { utils.traffic.settings.invalidate(); toast.success("Settings saved"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="animate-fade-in space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">Traffic Settings</h1><p className="text-muted-foreground">Configure traffic module options</p></div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Dispatch</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="dispatchLockHours" render={({ field }) => (
                <FormItem><FormLabel>Dispatch Lock Hours</FormLabel><FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormDescription>Hours before service date when dispatch is locked</FormDescription>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Portals</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="enableDriverPortal" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Driver Portal</FormLabel><FormDescription>Allow drivers to view and update assignments</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="enableRepPortal" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Rep Portal</FormLabel><FormDescription>Allow reps to view assigned jobs</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="enableSupplierPortal" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Supplier Portal</FormLabel><FormDescription>Allow suppliers to view and manage jobs</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="enableGuestBookings" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Guest Bookings</FormLabel><FormDescription>Enable B2C direct bookings</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="whatsappEnabled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>WhatsApp Notifications</FormLabel><FormDescription>Send job notifications via WhatsApp</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="pushEnabled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Push Notifications</FormLabel><FormDescription>Send push notifications to portal users</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Settings"}</Button>
        </form>
      </Form>
    </div>
  );
}
