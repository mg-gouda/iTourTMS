"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { z } from "zod";

import { InvoiceLineEditor } from "@/components/finance/invoice-line-editor";
import { JournalItemEditor } from "@/components/finance/journal-item-editor";
import { MoveStatusBar } from "@/components/finance/move-status-bar";
import { RegisterPaymentDialog } from "@/components/finance/register-payment-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { MOVE_TYPE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { moveCreateSchema } from "@/lib/validations/finance";

type MoveFormValues = z.input<typeof moveCreateSchema>;

interface MoveFormProps {
  moveType: string;
  defaultValues?: Partial<MoveFormValues> & {
    id?: string;
    state?: string;
    paymentState?: string;
    name?: string | null;
    amountUntaxed?: number;
    amountTax?: number;
    amountTotal?: number;
    amountResidual?: number;
  };
  returnPath: string;
}

const defaultLine = {
  accountId: "",
  name: "",
  displayType: "PRODUCT" as const,
  debit: 0,
  credit: 0,
  quantity: 1,
  priceUnit: 0,
  discount: 0,
  taxIds: [] as string[],
  sequence: 10,
};

export function MoveForm({ moveType, defaultValues, returnPath }: MoveFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;
  const isInvoice = moveType !== "ENTRY";
  const isDraft = !defaultValues?.state || defaultValues.state === "DRAFT";
  const isPosted = defaultValues?.state === "POSTED";
  const isCancelled = defaultValues?.state === "CANCELLED";
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const form = useForm<MoveFormValues>({
    resolver: zodResolver(moveCreateSchema),
    defaultValues: {
      moveType: moveType as any,
      date: new Date(),
      journalId: "",
      partnerId: null,
      currencyId: "",
      ref: null,
      narration: null,
      invoiceDate: null,
      invoiceDateDue: null,
      paymentTermId: null,
      fiscalPositionId: null,
      lineItems: [defaultLine],
      ...defaultValues,
    },
  });

  // Fetch reference data
  const { data: journals } = trpc.finance.journal.list.useQuery();
  const { data: accounts } = trpc.finance.account.list.useQuery({});
  const { data: partners } = trpc.finance.account.list.useQuery({}); // We'll use a partner query
  const { data: currencies } = trpc.finance.account.list.useQuery({}); // Placeholder
  const { data: taxList } = trpc.finance.tax.list.useQuery();
  const { data: paymentTerms } = trpc.finance.paymentTerm.list.useQuery();
  const { data: fiscalPositions } = trpc.finance.fiscalPosition.list.useQuery();

  // We need partners — let's fetch them separately
  // For now, use a simple approach using the existing tRPC context

  const createMutation = trpc.finance.move.create.useMutation({
    onSuccess: () => {
      utils.finance.move.list.invalidate();
      router.push(returnPath);
    },
  });

  const updateMutation = trpc.finance.move.update.useMutation({
    onSuccess: () => {
      utils.finance.move.list.invalidate();
      utils.finance.move.getById.invalidate();
      router.push(returnPath);
    },
  });

  const confirmMutation = trpc.finance.move.confirm.useMutation({
    onSuccess: () => {
      utils.finance.move.list.invalidate();
      utils.finance.move.getById.invalidate();
      router.refresh();
    },
  });

  const cancelMutation = trpc.finance.move.cancel.useMutation({
    onSuccess: () => {
      utils.finance.move.list.invalidate();
      utils.finance.move.getById.invalidate();
      router.refresh();
    },
  });

  const resetDraftMutation = trpc.finance.move.resetDraft.useMutation({
    onSuccess: () => {
      utils.finance.move.list.invalidate();
      utils.finance.move.getById.invalidate();
      router.refresh();
    },
  });

  const creditNoteMutation = trpc.finance.move.createCreditNote.useMutation({
    onSuccess: (data) => {
      utils.finance.move.list.invalidate();
      // Navigate to the new credit note
      const basePath = moveType === "OUT_INVOICE"
        ? "/finance/customers/credit-notes"
        : "/finance/vendors/refunds";
      router.push(`${basePath}/${data.id}`);
    },
  });

  function onSubmit(values: MoveFormValues) {
    if (isEdit && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const accountItems = accounts?.items ?? [];
  const taxItems = (taxList ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    amount: Number(t.amount),
  }));

  // Filter journals based on move type
  const filteredJournals = (journals ?? []).filter((j: any) => {
    if (moveType === "OUT_INVOICE" || moveType === "OUT_REFUND") return j.type === "SALE";
    if (moveType === "IN_INVOICE" || moveType === "IN_REFUND") return j.type === "PURCHASE";
    return true; // ENTRY can use any journal
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {MOVE_TYPE_LABELS[moveType] ?? moveType}
            </Badge>
            {defaultValues?.name && (
              <span className="font-mono text-lg font-bold">
                {defaultValues.name}
              </span>
            )}
          </div>
          {isEdit && (
            <MoveStatusBar
              state={defaultValues?.state ?? "DRAFT"}
              paymentState={defaultValues?.paymentState}
            />
          )}
        </div>

        <Separator />

        {/* Form Fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {isInvoice && (
            <FormField
              control={form.control}
              name="partnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {moveType.startsWith("OUT_") ? "Customer" : "Vendor"}
                  </FormLabel>
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === "__none" ? null : v)
                    }
                    value={field.value ?? "__none"}
                    disabled={!isDraft}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select partner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
                    {filteredJournals.map((j: any) => (
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
                    disabled={!isDraft}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isInvoice && (
            <>
              <FormField
                control={form.control}
                name="paymentTermId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none" ? null : v)
                      }
                      value={field.value ?? "__none"}
                      disabled={!isDraft}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {(paymentTerms ?? []).map((pt: any) => (
                          <SelectItem key={pt.id} value={pt.id}>
                            {pt.name}
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
                name="invoiceDateDue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
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
                name="fiscalPositionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Position</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none" ? null : v)
                      }
                      value={field.value ?? "__none"}
                      disabled={!isDraft}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {(fiscalPositions ?? []).map((fp: any) => (
                          <SelectItem key={fp.id} value={fp.id}>
                            {fp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="ref"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Reference"
                    disabled={!isDraft}
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

        {/* Line Items */}
        <div>
          <h3 className="mb-3 text-lg font-medium">
            {isInvoice ? "Invoice Lines" : "Journal Items"}
          </h3>
          {isDraft ? (
            isInvoice ? (
              <InvoiceLineEditor
                accounts={accountItems}
                taxes={taxItems}
              />
            ) : (
              <JournalItemEditor
                accounts={accountItems}
                partners={[]}
              />
            )
          ) : (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Line items are read-only for {defaultValues?.state?.toLowerCase()} moves.
            </div>
          )}
        </div>

        {/* Narration */}
        <FormField
          control={form.control}
          name="narration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Internal notes..."
                  rows={2}
                  disabled={!isDraft}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Totals Card (for invoices) */}
        {isInvoice && isEdit && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Untaxed Amount</span>
                    <span className="font-mono">
                      {Number(defaultValues?.amountUntaxed ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span className="font-mono">
                      {Number(defaultValues?.amountTax ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="font-mono">
                      {Number(defaultValues?.amountTotal ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount Due</span>
                    <span className="font-mono">
                      {Number(defaultValues?.amountResidual ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Update" : "Save Draft"}
              </Button>
              {isEdit && defaultValues?.id && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate({ id: defaultValues.id! })}
                >
                  {confirmMutation.isPending ? "Confirming..." : "Confirm"}
                </Button>
              )}
            </>
          )}
          {isPosted && defaultValues?.id && (
            <>
              <Button
                type="button"
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ id: defaultValues.id! })}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Entry"}
              </Button>
              {isInvoice && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={creditNoteMutation.isPending}
                    onClick={() =>
                      creditNoteMutation.mutate({ id: defaultValues.id! })
                    }
                  >
                    {creditNoteMutation.isPending
                      ? "Creating..."
                      : "Create Credit Note"}
                  </Button>
                  {(defaultValues?.amountResidual ?? 0) > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPaymentDialogOpen(true)}
                    >
                      Register Payment
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          {isCancelled && defaultValues?.id && (
            <Button
              type="button"
              variant="outline"
              disabled={resetDraftMutation.isPending}
              onClick={() =>
                resetDraftMutation.mutate({ id: defaultValues.id! })
              }
            >
              {resetDraftMutation.isPending ? "Resetting..." : "Reset to Draft"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(returnPath)}
          >
            Back
          </Button>
        </div>
      </form>

      {/* Register Payment Dialog */}
      {isPosted && isInvoice && defaultValues?.id && (
        <RegisterPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          invoiceMoveId={defaultValues.id}
          amountResidual={Number(defaultValues?.amountResidual ?? 0)}
        />
      )}
    </FormProvider>
  );
}
