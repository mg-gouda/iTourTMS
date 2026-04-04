"use client";

import { use } from "react";

import { MoveForm } from "@/components/finance/move-form";
import { trpc } from "@/lib/trpc";

export default function EditCustomerInvoicePage({
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
        Invoice not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.name ?? "Draft Invoice"}
          </h1>
          <p className="text-muted-foreground">
            {data.partner?.name ?? "No partner"}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          onClick={async () => {
            const { generateInvoicePdf } = await import("@/lib/export/finance-invoice-pdf");
            const pdf = generateInvoicePdf({
              name: data.name ?? "Invoice",
              moveType: data.moveType,
              state: data.state,
              paymentState: data.paymentState,
              date: data.date,
              dueDate: data.invoiceDateDue,
              ref: data.ref,
              narration: data.narration,
              amountUntaxed: data.amountUntaxed,
              amountTax: data.amountTax,
              amountTotal: data.amountTotal,
              amountResidual: data.amountResidual,
              partner: data.partner,
              journal: data.journal ?? { code: "", name: "" },
              currency: data.currency ?? data.companyCurrency ?? { code: "USD", symbol: "$" },
              paymentTerm: data.paymentTerm,
              lineItems: (data.lineItems ?? []).map((l: Record<string, unknown>) => ({
                displayType: l.displayType as string,
                name: l.name as string | null,
                accountName: (l.account as { name: string } | null)?.name ?? "",
                quantity: l.quantity,
                priceUnit: l.priceUnit,
                discount: l.discount,
                debit: l.debit,
                credit: l.credit,
                taxAmount: l.taxAmount ?? 0,
              })),
            });
            pdf.save(`${data.name ?? "invoice"}.pdf`);
          }}
        >
          Download PDF
        </button>
      </div>
      <MoveForm
        moveType="OUT_INVOICE"
        returnPath="/finance/customers/invoices"
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
