"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FISCAL_YEAR_STATE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FiscalYearRow = {
  id: string;
  name: string;
  code: string;
  dateFrom: string | Date;
  dateTo: string | Date;
  state: string;
  _count: { periods: number };
  closingMove: { id: string; name: string } | null;
};

export default function FiscalYearsPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.finance.period.listYears.useQuery();

  const columns: ColumnDef<FiscalYearRow, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tc("name")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "code",
      header: tc("code"),
      cell: ({ row }) => (
        <span className="font-mono">{row.getValue("code")}</span>
      ),
    },
    {
      id: "dateRange",
      header: t("dateRange"),
      cell: ({ row }) => {
        const from = new Date(row.original.dateFrom).toLocaleDateString();
        const to = new Date(row.original.dateTo).toLocaleDateString();
        return `${from} — ${to}`;
      },
    },
    {
      accessorKey: "state",
      header: tc("status"),
      cell: ({ row }) => {
        const state = row.getValue("state") as string;
        return (
          <Badge variant={state === "OPEN" ? "default" : "secondary"}>
            {FISCAL_YEAR_STATE_LABELS[state] ?? state}
          </Badge>
        );
      },
    },
    {
      id: "periods",
      header: t("periods"),
      cell: ({ row }) => row.original._count.periods,
    },
  ];

  return (
    <PermissionGuard permission="finance:period:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("fiscalYears")}</h1>
          <p className="text-muted-foreground">
            {t("fiscalYearsDesc")}
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/configuration/fiscal-years/new">
            <Plus className="mr-2 size-4" />
            {t("newFiscalYear")}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">
          {tc("loading")}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as any) ?? []}
          searchKey="name"
          searchPlaceholder={tc("search")}
          onRowClick={(row) =>
            router.push(`/finance/configuration/fiscal-years/${row.id}`)
          }
        />
      )}
    </div>
    </PermissionGuard>
  );
}
