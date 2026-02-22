"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import {
  TAX_AMOUNT_TYPE_LABELS,
  TAX_USE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { taxSchema } from "@/lib/validations/finance";

type TaxFormValues = z.input<typeof taxSchema>;

interface TaxFormProps {
  defaultValues?: Partial<TaxFormValues> & { id?: string };
}

export function TaxForm({ defaultValues }: TaxFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      name: "",
      typeTaxUse: "SALE",
      amountType: "PERCENT",
      amount: 0,
      priceInclude: false,
      includeBaseAmount: false,
      taxGroupId: null,
      taxScope: null,
      isActive: true,
      sequence: 10,
      repartitionLines: [
        {
          factorPercent: 100,
          accountId: null,
          useInTaxClosing: true,
          documentType: "INVOICE",
          sequence: 10,
        },
      ],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "repartitionLines",
  });

  const { data: taxGroups } = trpc.finance.tax.listGroups.useQuery();
  const { data: accounts } = trpc.finance.account.list.useQuery({});

  const createMutation = trpc.finance.tax.create.useMutation({
    onSuccess: () => {
      utils.finance.tax.list.invalidate();
      router.push("/finance/configuration/taxes");
    },
  });

  const updateMutation = trpc.finance.tax.update.useMutation({
    onSuccess: () => {
      utils.finance.tax.list.invalidate();
      router.push("/finance/configuration/taxes");
    },
  });

  function onSubmit(values: TaxFormValues) {
    if (isEdit && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const accountItems = accounts?.items ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="VAT 14%" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="14"
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
            name="typeTaxUse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Scope</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TAX_USE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
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
            name="amountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Computation</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TAX_AMOUNT_TYPE_LABELS).map(
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

          <FormField
            control={form.control}
            name="taxGroupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Group</FormLabel>
                <Select
                  onValueChange={(v) =>
                    field.onChange(v === "__none" ? null : v)
                  }
                  defaultValue={field.value ?? "__none"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {taxGroups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
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
            name="sequence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sequence</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-6">
          <FormField
            control={form.control}
            name="priceInclude"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Included in Price</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Repartition Lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Repartition Lines</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  factorPercent: 100,
                  accountId: null,
                  useInTaxClosing: true,
                  documentType: "INVOICE",
                  sequence: (fields.length + 1) * 10,
                })
              }
            >
              Add Line
            </Button>
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 items-end gap-3 rounded-md border p-3 md:grid-cols-5"
            >
              <FormField
                control={form.control}
                name={`repartitionLines.${index}.factorPercent`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Factor %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...f}
                        onChange={(e) =>
                          f.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`repartitionLines.${index}.accountId`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        f.onChange(v === "__none" ? null : v)
                      }
                      defaultValue={f.value ?? "__none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {accountItems.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`repartitionLines.${index}.documentType`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <Select
                      onValueChange={f.onChange}
                      defaultValue={f.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INVOICE">Invoice</SelectItem>
                        <SelectItem value="REFUND">Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`repartitionLines.${index}.useInTaxClosing`}
                render={({ field: f }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <Checkbox
                        checked={f.value}
                        onCheckedChange={f.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Tax Closing</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/finance/configuration/taxes")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
