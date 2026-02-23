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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { fiscalYearCreateSchema } from "@/lib/validations/finance";

type FormValues = z.input<typeof fiscalYearCreateSchema>;

export default function NewFiscalYearPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const currentYear = new Date().getFullYear();

  const form = useForm<FormValues>({
    resolver: zodResolver(fiscalYearCreateSchema),
    defaultValues: {
      name: `FY ${currentYear}`,
      code: String(currentYear),
      dateFrom: new Date(currentYear, 0, 1),
      dateTo: new Date(currentYear, 11, 31),
      includePeriod13: false,
    },
  });

  const createMutation = trpc.finance.period.createYear.useMutation({
    onSuccess: (data) => {
      utils.finance.period.listYears.invalidate();
      router.push(`/finance/configuration/fiscal-years/${data.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  // Auto-suggest name/code when dateFrom changes
  function handleDateFromChange(dateStr: string, onChange: (v: Date) => void) {
    const date = new Date(dateStr);
    onChange(date);
    const year = date.getFullYear();
    if (!isNaN(year)) {
      form.setValue("name", `FY ${year}`);
      form.setValue("code", String(year));
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Fiscal Year</h1>
        <p className="text-muted-foreground">
          Create a new fiscal year with auto-generated monthly periods.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="FY 2026" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="2026" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dateFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        handleDateFromChange(e.target.value, field.onChange)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="includePeriod13"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div>
                  <FormLabel>Include Period 13 (Adjustments)</FormLabel>
                  <FormDescription>
                    Add an extra period for year-end adjustments.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Fiscal Year"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/finance/configuration/fiscal-years")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
