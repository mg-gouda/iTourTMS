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
import { driverCreateSchema } from "@/lib/validations/traffic";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof driverCreateSchema>;

export default function NewDriverPage() {
  const t = useTranslations("traffic");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({ resolver: zodResolver(driverCreateSchema), defaultValues: { status: "ACTIVE", isActive: true } });

  const { data: users } = trpc.traffic.driver.listCompanyUsers.useQuery();
  const createMutation = trpc.traffic.driver.create.useMutation({
    onSuccess: (data) => { toast.success(tCommon("created")); utils.traffic.driver.invalidate(); router.push(`/traffic/drivers/${data.id}`); },
    onError: (err) => toast.error(err.message),
  });

  return (

    <PermissionGuard permission="traffic:driver:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">{t("newDriver")}</h1></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t("driverDetails")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("userAccount")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                <FormItem><FormLabel>{t("licenseNumber")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="licenseExpiry" render={({ field }) => (
                <FormItem><FormLabel>{t("licenseExpiry")}</FormLabel><FormControl><Input type="date" onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>{tCommon("phone")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? tCommon("creating") : t("createDriver")}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>{tCommon("cancel")}</Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
