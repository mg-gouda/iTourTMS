"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import { useTranslations } from "next-intl";

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
import { Combobox } from "@/components/ui/combobox";
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
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof budgetCreateSchema>;

const amountKeys = [
  "amount01", "amount02", "amount03", "amount04",
  "amount05", "amount06", "amount07", "amount08",
  "amount09", "amount10", "amount11", "amount12",
] as const;

const emptyLine = {
  accountId: "",
  amount01: 0, amount02: 0, amount03: 0, amount04: 0,
  amount05: 0, amount06: 0, amount07: 0, amount08: 0,
  amount09: 0, amount10: 0, amount11: 0, amount12: 0,
};

export default function EditBudgetPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: budget, isLoading } = trpc.finance.budget.getById.useQuery({ id });
  const { data: fiscalYears } = trpc.finance.period.listYears.useQuery();
  const { data: accounts } = trpc.finance.account.list.useQuery({ limit: 1000 });

  const form = useForm<FormValues>({
    resolver: zodResolver(budgetCreateSchema),
    defaultValues: { name: "", fiscalYearId: "", lines: [{ ...emptyLine }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  useEffect(() => {
    if (!budget) return;
    form.reset({
      name: budget.name,
      fiscalYearId: budget.fiscalYearId,
      lines: budget.lines.map((l: any) => ({
        accountId: l.accountId,
        amount01: Number(l.amount01),
        amount02: Number(l.amount02),
        amount03: Number(l.amount03),
        amount04: Number(l.amount04),
        amount05: Number(l.amount05),
        amount06: Number(l.amount06),
        amount07: Number(l.amount07),
        amount08: Number(l.amount08),
        amount09: Number(l.amount09),
        amount10: Number(l.amount10),
        amount11: Number(l.amount11),
        amount12: Number(l.amount12),
      })),
    });
  }, [budget, form]);

  const updateMutation = trpc.finance.budget.update.useMutation({
    onSuccess: () => {
      utils.finance.budget.getById.invalidate({ id });
      utils.finance.budget.list.invalidate();
      router.push(`/finance/accounting/budgets/${id}`);
    },
  });

  function distributeEvenly(lineIndex: number) {
    const values = form.getValues(`lines.${lineIndex}`);
    const total = amountKeys.reduce((s, k) => s + (Number(values[k]) || 0), 0);
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
    updateMutation.mutate({ id, ...values });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {tc("loading")}
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t("budgetNotFound")}
      </div>
    );
  }

  if (budget.state !== "DRAFT") {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t("onlyDraftBudgetsCanBeUpdated")}
      </div>
    );
  }

  return (
    <PermissionGuard permission="finance:budget:update">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("editBudget")}
          </h1>
          <p className="text-sm text-muted-foreground">{budget.name}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("budgetName")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>{t("fiscalYears")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={(fiscalYears ?? []).map((fy: any) => ({
                          value: fy.id,
                          label: fy.name,
                        }))}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        placeholder={tc("select")}
                        searchPlaceholder={tc("search")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{t("budgetLines")}</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ ...emptyLine })}
                >
                  <Plus className="mr-1 h-4 w-4" /> {t("addLine")}
                </Button>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 min-w-[200px] bg-background">
                        {t("accountName")}
                      </TableHead>
                      {BUDGET_MONTH_LABELS.map((m) => (
                        <TableHead key={m} className="min-w-[90px] text-right">
                          {m}
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[100px] text-right">
                        {t("annualTotal")}
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
                              <Combobox
                                options={((accounts as any) ?? []).map(
                                  (a: any) => ({
                                    value: a.id,
                                    label: `${a.code} — ${a.name}`,
                                  }),
                                )}
                                value={f.value ?? ""}
                                onValueChange={f.onChange}
                                placeholder={t("accountName")}
                                searchPlaceholder={tc("search")}
                              />
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
                                    f.onChange(parseFloat(e.target.value) || 0)
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
                              title={t("distributeEvenly")}
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

            {updateMutation.error && (
              <p className="text-sm text-destructive">
                {updateMutation.error.message}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? tc("saving") : tc("saveChanges")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(`/finance/accounting/budgets/${id}`)
                }
              >
                {tc("cancel")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </PermissionGuard>
  );
}
