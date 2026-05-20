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
import { BUDGET_STATE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type BudgetRow = {
  id: string;
  name: string;
  state: string;
  fiscalYear: { id: string; name: string; dateFrom: string | Date; dateTo: string | Date };
  _count: { lines: number };
  createdAt: string | Date;
};

const stateVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  APPROVED: "default",
  CANCELLED: "destructive",
};

export default function BudgetsPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.finance.budget.list.useQuery();

  const columns: ColumnDef<BudgetRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tc("name")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "fiscalYear.name",
      header: t("fiscalYears"),
      cell: ({ row }) => row.original.fiscalYear?.name ?? "—",
    },
    {
      accessorKey: "state",
      header: tc("status"),
      cell: ({ row }) => (
        <Badge variant={stateVariant[row.original.state] ?? "outline"}>
          {BUDGET_STATE_LABELS[row.original.state] ?? row.original.state}
        </Badge>
      ),
    },
    {
      accessorKey: "_count.lines",
      header: t("lines"),
      cell: ({ row }) => row.original._count.lines,
    },
    {
      accessorKey: "createdAt",
      header: tc("createdAt"),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGuard permission="finance:budget:read">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("budgets")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("budgetsDesc")}
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/accounting/budgets/new">
            <Plus className="mr-2 h-4 w-4" /> {t("newBudget")}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{tc("loading")}</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as BudgetRow[]) ?? []}
          searchKey="name"
          searchPlaceholder={tc("search")}
          onRowClick={(row) =>
            router.push(`/finance/accounting/budgets/${row.id}`)
          }
        />
      )}
    </div>
    </PermissionGuard>
  );
}
