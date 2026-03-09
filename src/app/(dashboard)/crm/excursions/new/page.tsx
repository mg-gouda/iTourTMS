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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CRM_ACTIVITY_CATEGORY_LABELS,
  CRM_PRODUCT_TYPE_LABELS,
  CRM_TRIP_MODE_LABELS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { excursionCreateSchema } from "@/lib/validations/crm";

type FormValues = z.input<typeof excursionCreateSchema>;

export default function NewExcursionPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(excursionCreateSchema),
    defaultValues: {
      code: "",
      name: "",
      productType: "ACTIVITY",
      category: "OTHER",
      tripMode: "SHARED",
      duration: "",
      description: "",
      inclusions: "",
      exclusions: "",
      minPax: 1,
      maxPax: undefined,
      active: true,
    },
  });

  const createMutation = trpc.crm.excursion.create.useMutation({
    onSuccess: (data) => {
      utils.crm.excursion.list.invalidate();
      router.push(`/crm/excursions/${data.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Excursion</h1>
        <p className="text-muted-foreground">Create an activity or tour package</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl><Input placeholder="DSF-001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Desert Safari" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="productType" render={({ field }) => (
              <FormItem>
                <FormLabel>Product Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(CRM_PRODUCT_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(CRM_ACTIVITY_CATEGORY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tripMode" render={({ field }) => (
              <FormItem>
                <FormLabel>Trip Mode</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(CRM_TRIP_MODE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="duration" render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <FormControl><Input placeholder="e.g. 4 hours, Full Day" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="minPax" render={({ field }) => (
              <FormItem>
                <FormLabel>Min Pax</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="maxPax" render={({ field }) => (
              <FormItem>
                <FormLabel>Max Pax</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Textarea rows={3} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="inclusions" render={({ field }) => (
            <FormItem>
              <FormLabel>Inclusions</FormLabel>
              <FormControl><Textarea rows={2} placeholder="What's included..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="exclusions" render={({ field }) => (
            <FormItem>
              <FormLabel>Exclusions</FormLabel>
              <FormControl><Textarea rows={2} placeholder="What's not included..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="active" render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel>Active</FormLabel>
            </FormItem>
          )} />

          {createMutation.error && (
            <p className="text-sm text-destructive">{createMutation.error.message}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Excursion"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/crm/excursions")}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
