"use client";

import { use } from "react";
import { useTranslations } from "next-intl";

import { BankStatementForm } from "@/components/finance/bank-statement-form";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ViewBankStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const { data, isLoading } = trpc.finance.bankStatement.getById.useQuery({
    id,
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-10 text-center">
        {t("bankStatementNotFound")}
      </div>
    );
  }

  return (
    <PermissionGuard permission="finance:bankStatement:read">
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.name ?? t("draftStatementTitle")}
          </h1>
          <p className="text-muted-foreground">
            {data.journal?.name ?? t("bankStatement")}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          onClick={async () => {
            const { generateStatementPdf } = await import("@/lib/export/finance-statement-pdf");
            const pdf = generateStatementPdf({
              name: data.name ?? "Statement",
              state: data.state,
              date: data.date,
              journal: data.journal ?? { code: "", name: "" },
              currency: (data.journal as Record<string, unknown>)?.currency as { code: string; symbol: string } ?? { code: "USD", symbol: "$" },
              openingBalance: data.balanceStart,
              closingBalance: data.balanceEnd,
              lines: (data.lines ?? []).map((l: Record<string, unknown>) => ({
                date: l.date as string,
                label: (l.name as string) ?? "",
                partnerName: (l.partner as { name: string } | null)?.name ?? null,
                ref: l.ref as string | null,
                amount: l.amount,
              })),
            });
            pdf.save(`${data.name ?? "statement"}.pdf`);
          }}
        >
          {t("downloadPdf")}
        </button>
      </div>
      <BankStatementForm
        defaultValues={{
          id: data.id,
          state: data.state,
          name: data.name,
          journalId: data.journalId,
          date: new Date(data.date),
          dateFrom: data.dateFrom ? new Date(data.dateFrom) : null,
          dateTo: data.dateTo ? new Date(data.dateTo) : null,
          balanceStart: Number(data.balanceStart),
          balanceEnd: Number(data.balanceEnd),
          balanceEndReal: Number(data.balanceEndReal),
          lines: data.lines.map((l: any) => ({
            id: l.id,
            date: new Date(l.date),
            name: l.name,
            ref: l.ref,
            amount: Number(l.amount),
            sequence: l.sequence,
            isReconciled: l.isReconciled,
          })),
        }}
      />
    </div>
    </PermissionGuard>
  );
}
