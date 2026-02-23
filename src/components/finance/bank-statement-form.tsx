"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, FormProvider } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BANK_STATEMENT_STATE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { bankStatementCreateSchema } from "@/lib/validations/finance";

type FormValues = z.input<typeof bankStatementCreateSchema>;

interface BankStatementFormProps {
  defaultValues?: Partial<FormValues> & {
    id?: string;
    state?: string;
    name?: string | null;
    balanceEndReal?: number;
    lines?: Array<{
      id?: string;
      date: Date | string;
      name: string;
      ref?: string | null;
      amount: number;
      sequence: number;
      isReconciled?: boolean;
    }>;
  };
}

export function BankStatementForm({ defaultValues }: BankStatementFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;
  const isDraft = !defaultValues?.state || defaultValues.state === "DRAFT";
  const isValidated = defaultValues?.state === "VALIDATED";

  const form = useForm<FormValues>({
    resolver: zodResolver(bankStatementCreateSchema),
    defaultValues: {
      journalId: "",
      date: new Date(),
      dateFrom: null,
      dateTo: null,
      balanceStart: 0,
      balanceEnd: 0,
      ...defaultValues,
      lines: defaultValues?.lines
        ? defaultValues.lines.map((l) => ({
            date: l.date instanceof Date ? l.date : new Date(l.date as string),
            name: l.name,
            ref: l.ref ?? null,
            partnerId: null,
            amount: Number(l.amount),
            sequence: l.sequence,
          }))
        : [{ date: new Date(), name: "", ref: null, partnerId: null, amount: 0, sequence: 10 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const { data: journals } = trpc.finance.journal.list.useQuery();
  const bankJournals = (journals ?? []).filter(
    (j: any) => j.type === "BANK" || j.type === "CASH",
  );

  const createMutation = trpc.finance.bankStatement.create.useMutation({
    onSuccess: (data) => {
      utils.finance.bankStatement.list.invalidate();
      router.push(`/finance/banking/statements/${data.id}`);
    },
  });

  const updateMutation = trpc.finance.bankStatement.update.useMutation({
    onSuccess: () => {
      utils.finance.bankStatement.list.invalidate();
      utils.finance.bankStatement.getById.invalidate();
      router.refresh();
    },
  });

  const validateMutation = trpc.finance.bankStatement.validate.useMutation({
    onSuccess: () => {
      utils.finance.bankStatement.list.invalidate();
      utils.finance.bankStatement.getById.invalidate();
      router.refresh();
    },
  });

  // Compute running balance
  const watchedLines = form.watch("lines");
  const balanceStart = form.watch("balanceStart") ?? 0;
  const computedBalanceEnd = watchedLines.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    balanceStart,
  );

  function onSubmit(values: FormValues) {
    if (isEdit && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {defaultValues?.name && (
              <span className="font-mono text-lg font-bold">{defaultValues.name}</span>
            )}
          </div>
          {isEdit && defaultValues?.state && (
            <Badge variant={isValidated ? "default" : "outline"}>
              {BANK_STATEMENT_STATE_LABELS[defaultValues.state] ?? defaultValues.state}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Form Fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <FormField
            control={form.control}
            name="journalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Journal</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                  disabled={!isDraft}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select journal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bankJournals.map((j: any) => (
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
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    disabled={!isDraft}
                    value={
                      field.value instanceof Date
                        ? field.value.toISOString().split("T")[0]
                        : typeof field.value === "string"
                          ? field.value.split("T")[0]
                          : ""
                    }
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="balanceStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Balance</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={!isDraft}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="balanceEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Closing Balance</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={!isDraft}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Statement Lines */}
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Statement Lines</h3>
              {isDraft && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      date: new Date(),
                      name: "",
                      ref: null,
                      partnerId: null,
                      amount: 0,
                      sequence: (fields.length + 1) * 10,
                    })
                  }
                >
                  <Plus className="mr-1 size-4" />
                  Add Line
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-40">Reference</TableHead>
                  <TableHead className="w-36 text-right">Amount</TableHead>
                  {isValidated && <TableHead className="w-24 text-center">Reconciled</TableHead>}
                  {isDraft && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, idx) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.date`}
                        render={({ field: f }) => (
                          <Input
                            type="date"
                            disabled={!isDraft}
                            value={
                              f.value instanceof Date
                                ? f.value.toISOString().split("T")[0]
                                : typeof f.value === "string"
                                  ? f.value.split("T")[0]
                                  : ""
                            }
                            onChange={(e) => f.onChange(new Date(e.target.value))}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.name`}
                        render={({ field: f }) => (
                          <Input
                            placeholder="Transaction description"
                            disabled={!isDraft}
                            {...f}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.ref`}
                        render={({ field: f }) => (
                          <Input
                            placeholder="Ref"
                            disabled={!isDraft}
                            {...f}
                            value={f.value ?? ""}
                            onChange={(e) => f.onChange(e.target.value || null)}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.amount`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            step="0.01"
                            className="text-right font-mono"
                            disabled={!isDraft}
                            {...f}
                            onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                          />
                        )}
                      />
                    </TableCell>
                    {isValidated && (
                      <TableCell className="text-center">
                        <Badge variant={defaultValues?.lines?.[idx]?.isReconciled ? "default" : "outline"}>
                          {defaultValues?.lines?.[idx]?.isReconciled ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                    )}
                    {isDraft && (
                      <TableCell>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => remove(idx)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Balance Summary */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Opening Balance</span>
                  <span className="font-mono">{balanceStart.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Computed Closing</span>
                  <span className="font-mono">{computedBalanceEnd.toFixed(2)}</span>
                </div>
                {isValidated && defaultValues?.balanceEndReal !== undefined && (
                  <div className="flex justify-between font-bold">
                    <span>Real Closing</span>
                    <span className="font-mono">
                      {Number(defaultValues.balanceEndReal).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isDraft && (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Draft" : "Create Draft"}
            </Button>
          )}
          {isDraft && isEdit && defaultValues?.id && (
            <Button
              type="button"
              variant="default"
              disabled={validateMutation.isPending}
              onClick={() => validateMutation.mutate({ id: defaultValues.id! })}
            >
              {validateMutation.isPending ? "Validating..." : "Validate"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/finance/banking/statements")}
          >
            Back
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
