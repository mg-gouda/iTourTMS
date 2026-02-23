"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RECURRING_FREQUENCY_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { recurringEntryCreateSchema } from "@/lib/validations/finance";

type FormValues = z.input<typeof recurringEntryCreateSchema>;

export default function NewRecurringEntryPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(recurringEntryCreateSchema),
    defaultValues: {
      name: "",
      journalId: "",
      partnerId: null,
      currencyId: "",
      ref: "",
      frequency: "MONTHLY",
      nextRunDate: new Date(),
      endDate: null,
      lineTemplates: [
        { accountId: "", partnerId: null, name: "", debit: 0, credit: 0, sequence: 10 },
        { accountId: "", partnerId: null, name: "", debit: 0, credit: 0, sequence: 20 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineTemplates",
  });

  const { data: journals } = trpc.finance.journal.list.useQuery();
  const { data: accounts } = trpc.finance.account.list.useQuery({ limit: 1000 });
  const { data: currencies } = trpc.finance.currency.list.useQuery();
  const { data: partners } = trpc.finance.journal.list.useQuery(); // partners not available directly, use journal list as proxy

  const createMutation = trpc.finance.recurringEntry.create.useMutation({
    onSuccess: (result) => {
      utils.finance.recurringEntry.list.invalidate();
      router.push(`/finance/accounting/recurring-entries/${result.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Recurring Entry
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a template for recurring journal entries
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monthly Rent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional reference"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="journalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Journal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select journal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {journals?.map((j: any) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.code} — {j.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currencyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(RECURRING_FREQUENCY_LABELS).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nextRunDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Run Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? new Date(e.target.value) : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? new Date(e.target.value) : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Line Templates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Line Templates</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    accountId: "",
                    partnerId: null,
                    name: "",
                    debit: 0,
                    credit: 0,
                    sequence: (fields.length + 1) * 10,
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Add Line
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Account</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lineTemplates.${index}.accountId`}
                        render={({ field: f }) => (
                          <Select onValueChange={f.onChange} value={f.value}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Account" />
                            </SelectTrigger>
                            <SelectContent>
                              {(accounts as any)?.map((a: any) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.code} — {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lineTemplates.${index}.name`}
                        render={({ field: f }) => (
                          <Input
                            placeholder="Label"
                            {...f}
                            value={f.value ?? ""}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lineTemplates.${index}.debit`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            className="text-right"
                            {...f}
                            onChange={(e) =>
                              f.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lineTemplates.${index}.credit`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            className="text-right"
                            {...f}
                            onChange={(e) =>
                              f.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      {fields.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {form.formState.errors.lineTemplates?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.lineTemplates.message}
              </p>
            )}
          </div>

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Recurring Entry"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push("/finance/accounting/recurring-entries")
              }
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
