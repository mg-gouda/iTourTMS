"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BUDGET_STATE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

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

const columns: ColumnDef<BudgetRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "fiscalYear.name",
    header: "Fiscal Year",
    cell: ({ row }) => row.original.fiscalYear?.name ?? "—",
  },
  {
    accessorKey: "state",
    header: "State",
    cell: ({ row }) => (
      <Badge variant={stateVariant[row.original.state] ?? "outline"}>
        {BUDGET_STATE_LABELS[row.original.state] ?? row.original.state}
      </Badge>
    ),
  },
  {
    accessorKey: "_count.lines",
    header: "Lines",
    cell: ({ row }) => row.original._count.lines,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

export default function BudgetsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.budget.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Annual budgets by account with monthly amounts
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/accounting/budgets/new">
            <Plus className="mr-2 h-4 w-4" /> New Budget
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as BudgetRow[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search budgets..."
          onRowClick={(row) =>
            router.push(`/finance/accounting/budgets/${row.id}`)
          }
        />
      )}
    </div>
  );
}
