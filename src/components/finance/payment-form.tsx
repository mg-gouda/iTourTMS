"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
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
import { MOVE_STATE_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { paymentCreateSchema } from "@/lib/validations/finance";

type PaymentFormValues = z.input<typeof paymentCreateSchema>;

interface PaymentFormProps {
  defaultValues?: Partial<PaymentFormValues> & {
    id?: string;
    state?: string;
    name?: string | null;
  };
}

export function PaymentForm({ defaultValues }: PaymentFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;
  const isDraft = !defaultValues?.state || defaultValues.state === "DRAFT";
  const isPosted = defaultValues?.state === "POSTED";
  const isCancelled = defaultValues?.state === "CANCELLED";

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: {
      paymentType: "INBOUND",
      partnerId: null,
      amount: 0,
      currencyId: "",
      date: new Date(),
      journalId: "",
      ref: null,
      invoiceMoveIds: [],
      ...defaultValues,
    },
  });

  const { data: journals } = trpc.finance.journal.list.useQuery();
  // Filter to cash/bank journals for payments
  const paymentJournals = (journals ?? []).filter(
    (j: any) => j.type === "CASH" || j.type === "BANK",
  );

  const createMutation = trpc.finance.payment.create.useMutation({
    onSuccess: (data) => {
      utils.finance.payment.list.invalidate();
      router.push(`/finance/payments/${data.id}`);
    },
  });

  const confirmMutation = trpc.finance.payment.confirm.useMutation({
    onSuccess: () => {
      utils.finance.payment.list.invalidate();
      utils.finance.payment.getById.invalidate();
      router.refresh();
    },
  });

  const cancelMutation = trpc.finance.payment.cancel.useMutation({
    onSuccess: () => {
      utils.finance.payment.list.invalidate();
      utils.finance.payment.getById.invalidate();
      router.refresh();
    },
  });

  function onSubmit(values: PaymentFormValues) {
    createMutation.mutate(values);
  }

  const isPending = createMutation.isPending;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {PAYMENT_TYPE_LABELS[form.watch("paymentType")] ?? "Payment"}
            </Badge>
            {defaultValues?.name && (
              <span className="font-mono text-lg font-bold">
                {defaultValues.name}
              </span>
            )}
          </div>
          {isEdit && defaultValues?.state && (
            <Badge
              variant={defaultValues.state === "POSTED" ? "default" : "outline"}
            >
              {MOVE_STATE_LABELS[defaultValues.state] ?? defaultValues.state}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Form Fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="paymentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!isDraft || isEdit}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="INBOUND">Customer Payment</SelectItem>
                    <SelectItem value="OUTBOUND">Vendor Payment</SelectItem>
                  </SelectContent>
                </Select>
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
                    step="0.01"
                    min="0.01"
                    disabled={!isDraft || isEdit}
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
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    disabled={!isDraft || isEdit}
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
            name="journalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Journal</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                  disabled={!isDraft || isEdit}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select journal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentJournals.map((j: any) => (
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
                <FormControl>
                  <Input
                    placeholder="Currency ID"
                    disabled={!isDraft || isEdit}
                    {...field}
                    value={field.value ?? ""}
                  />
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
                    placeholder="Payment reference"
                    disabled={!isDraft || isEdit}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Summary Card for existing payments */}
        {isEdit && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-base font-bold">
                    <span>Amount</span>
                    <span className="font-mono">
                      {Number(defaultValues?.amount ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isDraft && !isEdit && (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Draft"}
            </Button>
          )}
          {isDraft && isEdit && defaultValues?.id && (
            <Button
              type="button"
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate({ id: defaultValues.id! })}
            >
              {confirmMutation.isPending ? "Confirming..." : "Confirm Payment"}
            </Button>
          )}
          {isPosted && defaultValues?.id && (
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate({ id: defaultValues.id! })}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Payment"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/finance/payments")}
          >
            Back
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
