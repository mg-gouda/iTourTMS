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
  DELAY_TYPE_LABELS,
  TERM_VALUE_TYPE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { paymentTermSchema } from "@/lib/validations/finance";

type PaymentTermFormValues = z.input<typeof paymentTermSchema>;

interface PaymentTermFormProps {
  defaultValues?: Partial<PaymentTermFormValues> & { id?: string };
}

export function PaymentTermForm({ defaultValues }: PaymentTermFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;

  const form = useForm<PaymentTermFormValues>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      name: "",
      note: null,
      earlyDiscount: false,
      discountPercent: null,
      discountDays: null,
      lines: [
        {
          valueType: "BALANCE",
          valueAmount: 0,
          nbDays: 0,
          delayType: "DAYS_AFTER",
          sequence: 10,
        },
      ],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const earlyDiscount = form.watch("earlyDiscount");

  const createMutation = trpc.finance.paymentTerm.create.useMutation({
    onSuccess: () => {
      utils.finance.paymentTerm.list.invalidate();
      router.push("/finance/configuration/payment-terms");
    },
  });

  const updateMutation = trpc.finance.paymentTerm.update.useMutation({
    onSuccess: () => {
      utils.finance.paymentTerm.list.invalidate();
      router.push("/finance/configuration/payment-terms");
    },
  });

  function onSubmit(values: PaymentTermFormValues) {
    if (isEdit && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

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
                  <Input placeholder="Net 30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Optional note"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="earlyDiscount"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Early Payment Discount</FormLabel>
              </FormItem>
            )}
          />

          {earlyDiscount && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="discountPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : null,
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
                name="discountDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value, 10)
                              : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Installment Lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Installments</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  valueType: "BALANCE",
                  valueAmount: 0,
                  nbDays: 0,
                  delayType: "DAYS_AFTER",
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
                name={`lines.${index}.valueType`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
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
                        {Object.entries(TERM_VALUE_TYPE_LABELS).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`lines.${index}.valueAmount`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
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
                name={`lines.${index}.nbDays`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...f}
                        onChange={(e) =>
                          f.onChange(parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`lines.${index}.delayType`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Delay Type</FormLabel>
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
                        {Object.entries(DELAY_TYPE_LABELS).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
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
            onClick={() =>
              router.push("/finance/configuration/payment-terms")
            }
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
