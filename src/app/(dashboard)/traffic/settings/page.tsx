"use client";

import { useTranslations } from "next-intl";
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
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof ttSettingsUpdateSchema>;

export default function TrafficSettingsPage() {
  const utils = trpc.useUtils();
  const t = useTranslations("traffic");
  const tc = useTranslations("common");
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
    onSuccess: () => { utils.traffic.settings.invalidate(); toast.success(tc("saved")); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="animate-fade-in space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[400px] w-full" /></div>;

  return (

    <PermissionGuard permission="traffic:settings:manage">
      <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">{t("settings")}</h1><p className="text-muted-foreground">{t("trafficSettingsDesc")}</p></div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t("dispatch")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="dispatchLockHours" render={({ field }) => (
                <FormItem><FormLabel>{t("dispatchLockHours")}</FormLabel><FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormDescription>{t("dispatchLockHoursDesc")}</FormDescription>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("portals")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="enableDriverPortal" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>{t("driverPortal")}</FormLabel><FormDescription>{t("driverPortalDesc")}</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="enableRepPortal" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>{t("repPortal")}</FormLabel><FormDescription>{t("repPortalDesc")}</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="enableSupplierPortal" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>{t("supplierPortal")}</FormLabel><FormDescription>{t("supplierPortalDesc")}</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="enableGuestBookings" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>{t("guestBookingsFeature")}</FormLabel><FormDescription>{t("guestBookingsFeatureDesc")}</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("notifications")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="whatsappEnabled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>{t("whatsappNotifications")}</FormLabel><FormDescription>{t("whatsappNotificationsDesc")}</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="pushEnabled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>{t("pushNotifications")}</FormLabel><FormDescription>{t("pushNotificationsDesc")}</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? tc("saving") : t("saveSettings")}</Button>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
