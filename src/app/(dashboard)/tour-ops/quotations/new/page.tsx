"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

const formSchema = z.object({
  packageId: z.string().min(1, "Package is required"),
  clientType: z.enum(["B2C", "TOUR_OPERATOR", "TRAVEL_AGENT"]).default("B2C"),
  validUntil: z.string().optional(),
  packageMarkupType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  packageMarkupValue: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function NewQuotationForm({ fileId }: { fileId: string }) {
  const router = useRouter();
  const t = useTranslations("tourOps");

  const { data: packages, isLoading: pkgLoading } = trpc.tourOps.package.list.useQuery({ fileId });

  const create = trpc.tourOps.quotation.create.useMutation({
    onSuccess: (q) => {
      toast.success("Quotation created");
      router.push(`/tour-ops/quotations/${q?.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { clientType: "B2C" },
  });

  const markupType = form.watch("packageMarkupType");

  if (pkgLoading) return <Skeleton className="h-64 w-full" />;

  if (!packages?.length) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p className="text-sm">No packages found for this file.</p>
        <p className="mt-1 text-xs">Create a package first before issuing a quotation.</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={`/tour-ops/files/${fileId}`}>← Back to File</Link>
        </Button>
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    create.mutate({
      fileId,
      ...values,
      packageMarkupValue: values.packageMarkupValue ?? undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Quotation Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Package */}
            <FormField
              control={form.control}
              name="packageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select package…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — ${Number(p.totalCost).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client Type */}
            <FormField
              control={form.control}
              name="clientType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="B2C">B2C (Direct)</SelectItem>
                      <SelectItem value="TOUR_OPERATOR">Tour Operator</SelectItem>
                      <SelectItem value="TRAVEL_AGENT">Travel Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valid Until */}
            <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid Until</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Package Markup */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Package Markup (optional)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="packageMarkupType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Markup Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {markupType && (
              <FormField
                control={form.control}
                name="packageMarkupValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Markup Value {markupType === "PERCENTAGE" ? "(%)" : ""}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Notes & Terms */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Notes & Terms</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Internal notes…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Terms shown on the quotation…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href={`/tour-ops/files/${fileId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={create.isPending}>
            <Save className="mr-1.5 h-4 w-4" />
            {create.isPending ? "Creating…" : "Create Quotation"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const fileId = searchParams.get("fileId") ?? "";

  if (!fileId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Missing file ID. Please navigate here from an Ops File.</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/tour-ops/files">Go to Files</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/tour-ops/files/${fileId}`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">New Quotation</h1>
          <p className="text-sm text-muted-foreground">Create a pricing quotation for the ops file</p>
        </div>
      </div>
      <NewQuotationForm fileId={fileId} />
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <PermissionGuard permission="tour-ops:quotation:create">
      <Suspense fallback={<div className="p-6"><Skeleton className="h-64 w-full" /></div>}>
        <PageContent />
      </Suspense>
    </PermissionGuard>
  );
}
