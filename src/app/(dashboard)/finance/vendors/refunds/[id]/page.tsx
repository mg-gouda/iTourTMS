"use client";

import { use } from "react";

import { MoveForm } from "@/components/finance/move-form";
import { trpc } from "@/lib/trpc";

export default function EditVendorRefundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = trpc.finance.move.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        Refund not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {data.name ?? "Draft Refund"}
        </h1>
        <p className="text-muted-foreground">
          {data.partner?.name ?? "No vendor"}
        </p>
      </div>
      <MoveForm
        moveType="IN_REFUND"
        returnPath="/finance/vendors/refunds"
        defaultValues={{
          id: data.id,
          state: data.state,
          paymentState: data.paymentState,
          name: data.name,
          moveType: data.moveType as any,
          date: new Date(data.date),
          journalId: data.journalId,
          partnerId: data.partnerId,
          currencyId: data.currencyId,
          ref: data.ref,
          narration: data.narration,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
          invoiceDateDue: data.invoiceDateDue ? new Date(data.invoiceDateDue) : null,
          paymentTermId: data.paymentTermId,
          amountUntaxed: Number(data.amountUntaxed),
          amountTax: Number(data.amountTax),
          amountTotal: Number(data.amountTotal),
          amountResidual: Number(data.amountResidual),
          lineItems: data.lineItems
            .filter((li: any) => li.displayType === "PRODUCT" || li.displayType === "LINE_SECTION" || li.displayType === "LINE_NOTE")
            .map((li: any) => ({
              accountId: li.accountId,
              partnerId: li.partnerId,
              name: li.name,
              displayType: li.displayType,
              debit: Number(li.debit),
              credit: Number(li.credit),
              quantity: Number(li.quantity),
              priceUnit: Number(li.priceUnit),
              discount: Number(li.discount),
              taxIds: li.taxes?.map((t: any) => t.id) ?? [],
              dateMaturity: li.dateMaturity ? new Date(li.dateMaturity) : null,
              sequence: li.sequence,
            })),
        }}
      />
    </div>
  );
}
