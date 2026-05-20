"use client";

import { useParams, useRouter } from "next/navigation";
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

export default function NewFilePackagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const createPackage = trpc.tourOps.package.create.useMutation({
    onSuccess: (pkg) => {
      toast.success("Package created — add components now");
      router.push(`/tour-ops/templates/${pkg.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(opsPackageCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      fileId: id,
      isTemplate: false,
      baseCurrency: "USD",
      notes: "",
    },
  });

  return (

    <PermissionGuard permission="tour-ops:file:read">
      <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Add Package</h1>
        <p className="text-sm text-muted-foreground">Create a tour package for this file</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createPackage.mutate(v))} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Package Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. 7-Night Egypt Classic" /></FormControl>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder="Optional short description" /></FormControl>
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

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={createPackage.isPending}>
              {createPackage.isPending ? "Creating..." : "Create & Add Components"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
