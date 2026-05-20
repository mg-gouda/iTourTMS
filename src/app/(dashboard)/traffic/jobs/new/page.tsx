"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";
import { trafficJobCreateSchema } from "@/lib/validations/traffic";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof trafficJobCreateSchema>;

export default function NewTrafficJobPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useTranslations("traffic");
  const tc = useTranslations("common");

  const form = useForm<FormValues>({
    resolver: zodResolver(trafficJobCreateSchema),
    defaultValues: {
      serviceType: "ARR",
      paxCount: 1,
      price: 0,
      cost: 0,
    },
  });

  const { data: vehicleTypes } = trpc.traffic.vehicleType.list.useQuery();
  const { data: airports } = trpc.traffic.airport.list.useQuery();
  const { data: zones } = trpc.traffic.zone.list.useQuery();
  const { data: flights } = trpc.traffic.trafficFlight.list.useQuery();

  const createMutation = trpc.traffic.trafficJob.create.useMutation({
    onSuccess: (data) => {
      toast.success("Job created");
      utils.traffic.trafficJob.invalidate();
      router.push(`/traffic/jobs/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  return (

    <PermissionGuard permission="traffic:job:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="text-2xl font-bold">{t("newTrafficJob")}</h1>
        <p className="text-muted-foreground">{t("createStandaloneJob")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Service Details */}
            <Card>
              <CardHeader><CardTitle>{t("serviceDetails")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="serviceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceType")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(TT_SERVICE_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="serviceDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" onChange={(e) => field.onChange(new Date(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="pickupTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("pickupTime")}</FormLabel>
                      <FormControl><Input type="time" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dropoffTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("dropoffTime")}</FormLabel>
                      <FormControl><Input type="time" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="vehicleTypeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("vehicleType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={tc("select") + " " + t("vehicleType")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicleTypes?.map((vt) => (
                          <SelectItem key={vt.id} value={vt.id}>{vt.name} ({vt.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="zoneId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("zone")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={tc("select") + " " + t("zone")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {zones?.map((z) => (
                          <SelectItem key={z.id} value={z.id}>{z.name} ({z.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="flightId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("flights")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={tc("select")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {flights?.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.flightNumber} - {new Date(f.flightDate).toLocaleDateString()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Pickup & Dropoff */}
            <Card>
              <CardHeader><CardTitle>{t("pickupDropoff")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="pickupAirportId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pickupAirport")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={tc("select")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {airports?.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pickupAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pickupAddress")}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="dropoffAirportId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dropoffAirport")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={tc("select")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {airports?.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="dropoffAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dropoffAddress")}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="paxCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("passengers")}</FormLabel>
                      <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tc("amount")}</FormLabel>
                      <FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="leadPassenger" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leadPassenger")}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="passengerPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passengerPhone")}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="passengerNotes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc("notes")}</FormLabel>
                    <FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? tc("creating") : t("createJob")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
