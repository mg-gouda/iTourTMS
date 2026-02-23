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
import { BUDGET_MONTH_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { budgetCreateSchema } from "@/lib/validations/finance";

type FormValues = z.input<typeof budgetCreateSchema>;

const emptyLine = {
  accountId: "",
  amount01: 0, amount02: 0, amount03: 0, amount04: 0,
  amount05: 0, amount06: 0, amount07: 0, amount08: 0,
  amount09: 0, amount10: 0, amount11: 0, amount12: 0,
};

const amountKeys = [
  "amount01", "amount02", "amount03", "amount04",
  "amount05", "amount06", "amount07", "amount08",
  "amount09", "amount10", "amount11", "amount12",
] as const;

export default function NewBudgetPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(budgetCreateSchema),
    defaultValues: {
      name: "",
      fiscalYearId: "",
      lines: [{ ...emptyLine }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const { data: fiscalYears } = trpc.finance.period.listYears.useQuery();
  const { data: accounts } = trpc.finance.account.list.useQuery({ limit: 1000 });

  const createMutation = trpc.finance.budget.create.useMutation({
    onSuccess: (result) => {
      utils.finance.budget.list.invalidate();
      router.push(`/finance/accounting/budgets/${result.id}`);
    },
  });

  function distributeEvenly(lineIndex: number) {
    const values = form.getValues(`lines.${lineIndex}`);
    const total = amountKeys.reduce(
      (s, k) => s + (Number(values[k]) || 0),
      0,
    );
    if (total === 0) return;
    const monthly = Math.round((total / 12) * 100) / 100;
    for (const key of amountKeys) {
      form.setValue(`lines.${lineIndex}.${key}`, monthly);
    }
  }

  function lineTotal(lineIndex: number): number {
    const values = form.getValues(`lines.${lineIndex}`);
    return amountKeys.reduce((s, k) => s + (Number(values[k]) || 0), 0);
  }

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Budget</h1>
        <p className="text-sm text-muted-foreground">
          Create a budget with monthly amounts per account
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Operating Budget 2026"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fiscalYearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal Year</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select fiscal year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fiscalYears?.map((fy: any) => (
                        <SelectItem key={fy.id} value={fy.id}>
                          {fy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Budget Lines - Spreadsheet Style */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Budget Lines</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...emptyLine })}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Line
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 min-w-[200px] bg-background">
                      Account
                    </TableHead>
                    {BUDGET_MONTH_LABELS.map((m) => (
                      <TableHead
                        key={m}
                        className="min-w-[90px] text-right"
                      >
                        {m}
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[100px] text-right">
                      Annual
                    </TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, lineIdx) => (
                    <TableRow key={field.id}>
                      <TableCell className="sticky left-0 z-10 bg-background">
                        <FormField
                          control={form.control}
                          name={`lines.${lineIdx}.accountId`}
                          render={({ field: f }) => (
                            <Select
                              onValueChange={f.onChange}
                              value={f.value}
                            >
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
                      {amountKeys.map((key) => (
                        <TableCell key={key}>
                          <FormField
                            control={form.control}
                            name={`lines.${lineIdx}.${key}`}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                className="w-[85px] text-right"
                                {...f}
                                onChange={(e) =>
                                  f.onChange(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            )}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-medium">
                        {lineTotal(lineIdx).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Distribute evenly"
                            onClick={() => distributeEvenly(lineIdx)}
                          >
                            =
                          </Button>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(lineIdx)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {form.formState.errors.lines?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.lines.message}
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
              {createMutation.isPending ? "Creating..." : "Create Budget"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/finance/accounting/budgets")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
