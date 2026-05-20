"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

type UnreconciledRow = {
  id: string;
  name: string | null;
  debit: string;
  credit: string;
  balance: string;
  dateMaturity: string | null;
  move: { name: string | null; date: string; journal: { code: string } };
  account: { code: string; name: string };
  partner: { name: string } | null;
};

export default function ReconcilePage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = trpc.finance.review.journalItems.useQuery({ unreconciled: true, pageSize: 100 });

  const items = (data?.items as any) ?? [];

  const columns: ColumnDef<UnreconciledRow, unknown>[] = [
    { id: "date", accessorFn: (r) => r.move.date, header: ({ column }) => <DataTableColumnHeader column={column} title={tc("date")} />, cell: ({ row }) => new Date(row.original.move.date).toLocaleDateString() },
    { id: "entry", accessorFn: (r) => r.move.name ?? tc("draft"), header: t("entry"), cell: ({ row }) => <span className="font-mono">{row.original.move.name ?? tc("draft")}</span> },
    { id: "account", accessorFn: (r) => r.account.name, header: t("accountName"), cell: ({ row }) => <span><span className="font-mono text-muted-foreground mr-1">{row.original.account.code}</span>{row.original.account.name}</span> },
    { id: "partner", accessorFn: (r) => r.partner?.name ?? "—", header: t("partner") },
    { accessorKey: "debit", header: ({ column }) => <DataTableColumnHeader column={column} title={t("debit")} />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.getValue("debit")).toFixed(2)}</span> },
    { accessorKey: "credit", header: ({ column }) => <DataTableColumnHeader column={column} title={t("credit")} />, cell: ({ row }) => <span className="font-mono tabular-nums">{Number(row.getValue("credit")).toFixed(2)}</span> },
    { id: "balance", accessorFn: (r) => r.balance, header: t("balance"), cell: ({ row }) => { const v = Number(row.original.balance); return <span className={`font-mono tabular-nums ${v < 0 ? "text-destructive" : "text-green-600"}`}>{v.toFixed(2)}</span>; } },
    { id: "maturity", accessorFn: (r) => r.dateMaturity, header: t("maturity"), cell: ({ row }) => row.original.dateMaturity ? new Date(row.original.dateMaturity).toLocaleDateString() : "—" },
    {
      id: "select",
      header: tc("select"),
      cell: ({ row }) => (
        <input type="checkbox" checked={selected.includes(row.original.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, row.original.id] : prev.filter((id) => id !== row.original.id))} />
      ),
    },
  ];

  return (
    <PermissionGuard permission="finance:reconciliation:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("reconcile")}</h1>
          <p className="text-muted-foreground">{t("reconcileDesc")}</p>
        </div>
        <Button variant="outline" onClick={() => setSelected([])}><RefreshCw className="mr-2 size-4" />{t("clearSelection")}</Button>
      </div>

      <div className="rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        {t("reconcileHint")}&nbsp;
        <Badge variant="outline">{items.length} {t("unreconciledLines")}</Badge>
      </div>

      {isLoading ? <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div> : (
        <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder={tc("search")} />
      )}
    </div>
    </PermissionGuard>
  );
}
