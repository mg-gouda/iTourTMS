"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { supplierCreateSchema } from "@/lib/validations/crm";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

type FormValues = z.input<typeof supplierCreateSchema>;

export default function NewSupplierPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(supplierCreateSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      type: "",
      notes: "",
      active: true,
    },
  });

  const createMutation = trpc.crm.supplier.create.useMutation({
    onSuccess: (data) => {
      utils.crm.supplier.invalidate();
      toast.success(t("newSupplier"));
      router.push(`/crm/suppliers/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (

    <PermissionGuard permission="crm:supplier:read">
      <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newSupplier")}</h1>
        <p className="text-muted-foreground">{t("manageSuppliers")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tc("name")} *</FormLabel>
                <FormControl>
                  <Input placeholder="Supplier name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contactPerson")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tc("type")}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Boat, Ground, Guide" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tc("email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tc("phone")}</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tc("notes")}</FormLabel>
                <FormControl>
                  <Textarea placeholder="Internal notes..." rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">{tc("active")}</FormLabel>
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? tc("creating") : t("newSupplier")}
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
