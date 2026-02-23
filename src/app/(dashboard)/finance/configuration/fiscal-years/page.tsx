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
import { FISCAL_YEAR_STATE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

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

const columns: ColumnDef<FiscalYearRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue("code")}</span>
    ),
  },
  {
    id: "dateRange",
    header: "Date Range",
    cell: ({ row }) => {
      const from = new Date(row.original.dateFrom).toLocaleDateString();
      const to = new Date(row.original.dateTo).toLocaleDateString();
      return `${from} — ${to}`;
    },
  },
  {
    accessorKey: "state",
    header: "State",
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
    header: "Periods",
    cell: ({ row }) => row.original._count.periods,
  },
];

export default function FiscalYearsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.period.listYears.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fiscal Years</h1>
          <p className="text-muted-foreground">
            Manage fiscal years, periods, and year-end closing.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/configuration/fiscal-years/new">
            <Plus className="mr-2 size-4" />
            New Fiscal Year
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as any) ?? []}
          searchKey="name"
          searchPlaceholder="Search fiscal years..."
          onRowClick={(row) =>
            router.push(`/finance/configuration/fiscal-years/${row.id}`)
          }
        />
      )}
    </div>
  );
}
