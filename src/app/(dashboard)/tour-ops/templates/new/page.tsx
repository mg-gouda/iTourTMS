"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { opsPackageCreateSchema } from "@/lib/validations/tour-ops";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof opsPackageCreateSchema>;

export default function NewTemplatePage() {
  const router = useRouter();
  const create = trpc.tourOps.package.create.useMutation({
    onSuccess: (pkg) => {
      toast.success("Template created");
      router.push(`/tour-ops/templates/${pkg.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(opsPackageCreateSchema),
    defaultValues: { name: "", isTemplate: true, baseCurrency: "USD" },
  });

  return (

    <PermissionGuard permission="tour-ops:package:read">
      <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Template</h1>
        <p className="text-sm text-muted-foreground">Create a reusable package blueprint</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => create.mutate({ ...v, isTemplate: true }))} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Package Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Egypt Classic 7 Nights" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder="Brief description of this template..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Currency</FormLabel>
                    <FormControl><Input {...field} placeholder="USD" className="w-28" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder="Internal notes..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">After saving, you will be able to add components (accommodation, transfers, flights, etc.) to this template.</p>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
