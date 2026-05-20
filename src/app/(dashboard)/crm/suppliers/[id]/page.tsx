"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CRM_COST_TYPE_LABELS } from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { supplierUpdateSchema } from "@/lib/validations/crm";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

type FormValues = z.input<typeof supplierUpdateSchema>;

export default function SupplierDetailPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: supplier, isLoading } = trpc.crm.supplier.getById.useQuery({ id });

  const form = useForm<FormValues>({
    resolver: zodResolver(supplierUpdateSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name,
        contactName: supplier.contactName ?? "",
        email: supplier.email ?? "",
        phone: supplier.phone ?? "",
        type: supplier.type ?? "",
        notes: supplier.notes ?? "",
        active: supplier.active,
      });
    }
  }, [supplier, form]);

  const updateMutation = trpc.crm.supplier.update.useMutation({
    onSuccess: () => {
      utils.crm.supplier.getById.invalidate({ id });
      utils.crm.supplier.list.invalidate();
    },
  });

  const deleteMutation = trpc.crm.supplier.delete.useMutation({
    onSuccess: () => {
      utils.crm.supplier.list.invalidate();
      router.push("/crm/suppliers");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!supplier) return <p>{t("supplier")} not found</p>;

  const components = supplier.costComponents ?? [];

  return (

    <PermissionGuard permission="crm:supplier:read">
      <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
            <Badge variant={supplier.active ? "default" : "secondary"}>
              {supplier.active ? tc("active") : tc("inactive")}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {supplier.type && <span>{supplier.type}</span>}
            {supplier.contactName && <span>{t("contactPerson")}: {supplier.contactName}</span>}
            <span>{components.length} {t("costComponents")}</span>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm(tc("confirmDelete"))) deleteMutation.mutate({ id });
          }}
          disabled={components.length > 0}
          title={components.length > 0 ? "Remove linked cost components first" : undefined}
        >
          {tc("delete")}
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{tc("details")}</TabsTrigger>
          <TabsTrigger value="components">{t("costComponents")} ({components.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => updateMutation.mutate({ id, data: v }))} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>{tc("name")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contactName" render={({ field }) => (
                    <FormItem><FormLabel>{t("contactPerson")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>{tc("email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>{tc("phone")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>{tc("type")}</FormLabel><FormControl><Input placeholder="e.g. boat, restaurant, guide" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>{tc("notes")}</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="active" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel>{tc("active")}</FormLabel>
                    </FormItem>
                  )} />
                  {updateMutation.error && <p className="text-sm text-destructive">{updateMutation.error.message}</p>}
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? tc("saving") : t("saveChanges")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="mt-4">
          {components.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noItems")}</p>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{t("excursion")}</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{t("costSheet")}</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{tc("type")}</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{tc("description")}</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium">{t("unitCost")}</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium">Qty</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium">{tc("total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((comp) => (
                    <tr key={comp.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5">
                        {comp.costSheet?.excursion ? (
                          <Link href={`/crm/excursions/${comp.costSheet.excursion.id}`} className="text-primary hover:underline">
                            <span className="font-mono text-xs">{comp.costSheet.excursion.code}</span>
                            <span className="ml-1">{comp.costSheet.excursion.name}</span>
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{comp.costSheet?.name ?? "—"}</td>
                      <td className="px-3 py-1.5">
                        <Badge variant="outline" className="text-xs">
                          {CRM_COST_TYPE_LABELS[comp.costType] ?? comp.costType}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5">{comp.description}</td>
                      <td className="px-3 py-1.5 text-right font-mono">${Number(comp.unitCost).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right">{comp.qty}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold">{comp.currency} {Number(comp.unitCost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  

    </PermissionGuard>

  );
}
