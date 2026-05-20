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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { trafficFlightCreateSchema } from "@/lib/validations/traffic";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof trafficFlightCreateSchema>;

export default function NewFlightPage() {
  const t = useTranslations("traffic");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({ resolver: zodResolver(trafficFlightCreateSchema) });

  const { data: airports } = trpc.traffic.airport.list.useQuery();
  const createMutation = trpc.traffic.trafficFlight.create.useMutation({
    onSuccess: (data) => { toast.success(tCommon("created")); utils.traffic.trafficFlight.invalidate(); router.push(`/traffic/flights/${data.id}`); },
    onError: (err) => toast.error(err.message),
  });

  return (

    <PermissionGuard permission="traffic:airport:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">{t("newFlight")}</h1></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t("flightDetails")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="flightNumber" render={({ field }) => (
                <FormItem><FormLabel>{t("flightNumber")}</FormLabel><FormControl><Input {...field} placeholder="e.g. MS800" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="airlineCode" render={({ field }) => (
                <FormItem><FormLabel>{t("airlineCode")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="e.g. MS" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="flightDate" render={({ field }) => (
                <FormItem><FormLabel>{t("flightDate")}</FormLabel><FormControl><Input type="date" onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="terminal" render={({ field }) => (
                <FormItem><FormLabel>{t("terminal")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="arrAirportId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("arrivalAirport")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger></FormControl>
                    <SelectContent>{airports?.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="arrTime" render={({ field }) => (
                <FormItem><FormLabel>{t("arrivalTime")}</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="depAirportId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("departureAirport")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger></FormControl>
                    <SelectContent>{airports?.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="depTime" render={({ field }) => (
                <FormItem><FormLabel>{t("departureTime")}</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? tCommon("creating") : t("createFlight")}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>{tCommon("cancel")}</Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
