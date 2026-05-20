"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";
import { guestBookingCreateSchema } from "@/lib/validations/traffic";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof guestBookingCreateSchema>;

export default function NewGuestBookingPage() {
  const t = useTranslations("traffic");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(guestBookingCreateSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      pickupAddress: "",
      dropoffAddress: "",
      notes: "",
      serviceType: "ARR",
      paxCount: 1,
      quotedPrice: 0,
      currencyId: "",
    },
  });

  const { data: vehicleTypes } = trpc.traffic.vehicleType.list.useQuery();
  const { data: currencies } = trpc.finance.currency.list.useQuery();

  const createMutation = trpc.traffic.guestBooking.create.useMutation({
    onSuccess: (data) => {
      toast.success(tCommon("created"));
      utils.traffic.guestBooking.invalidate();
      router.push(`/traffic/guest-bookings/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (

    <PermissionGuard permission="traffic:guestBooking:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">{t("newGuestBooking")}</h1></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t("bookingDetails")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="guestName" render={({ field }) => (
                <FormItem><FormLabel>{t("guestName")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="guestEmail" render={({ field }) => (
                <FormItem><FormLabel>{tCommon("email")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="guestPhone" render={({ field }) => (
                <FormItem><FormLabel>{tCommon("phone")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="serviceType" render={({ field }) => (
                <FormItem><FormLabel>{t("serviceType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(TT_SERVICE_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vehicleTypeId" render={({ field }) => (
                <FormItem><FormLabel>{t("vehicleType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {vehicleTypes?.map((vt) => <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="serviceDate" render={({ field }) => (
                <FormItem><FormLabel>{t("serviceDate")}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value instanceof Date ? field.value.toISOString().split("T")[0] : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="paxCount" render={({ field }) => (
                <FormItem><FormLabel>{t("passengers")}</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} value={field.value ?? 1} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currencyId" render={({ field }) => (
                <FormItem><FormLabel>{tCommon("currency")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {currencies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="quotedPrice" render={({ field }) => (
                <FormItem><FormLabel>{t("quotedPrice")}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" value={field.value ?? 0} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pickupAddress" render={({ field }) => (
                <FormItem><FormLabel>{t("pickupAddressLabel")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dropoffAddress" render={({ field }) => (
                <FormItem><FormLabel>{t("dropoffAddressLabel")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="sm:col-span-2"><FormLabel>{tCommon("notes")}</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? tCommon("creating") : t("createBooking")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>{tCommon("cancel")}</Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
