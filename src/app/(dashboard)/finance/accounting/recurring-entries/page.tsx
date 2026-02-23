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
import {
  RECURRING_FREQUENCY_LABELS,
  RECURRING_STATE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type RecurringRow = {
  id: string;
  name: string;
  journal: { code: string; name: string } | null;
  partner: { name: string } | null;
  frequency: string;
  state: string;
  nextRunDate: string | Date;
  totalGenerated: number;
  _count: { lineTemplates: number };
};

const stateVariant: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  PAUSED: "secondary",
  DONE: "outline",
};

const columns: ColumnDef<RecurringRow>[] = [
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
    accessorKey: "journal",
    header: "Journal",
    cell: ({ row }) => {
      const j = row.original.journal;
      return j ? `${j.code} — ${j.name}` : "—";
    },
  },
  {
    accessorKey: "partner",
    header: "Partner",
    cell: ({ row }) => row.original.partner?.name ?? "—",
  },
  {
    accessorKey: "frequency",
    header: "Frequency",
    cell: ({ row }) =>
      RECURRING_FREQUENCY_LABELS[row.original.frequency] ??
      row.original.frequency,
  },
  {
    accessorKey: "state",
    header: "State",
    cell: ({ row }) => (
      <Badge variant={stateVariant[row.original.state] ?? "outline"}>
        {RECURRING_STATE_LABELS[row.original.state] ?? row.original.state}
      </Badge>
    ),
  },
  {
    accessorKey: "nextRunDate",
    header: "Next Run",
    cell: ({ row }) => {
      const d = row.original.nextRunDate;
      return d ? new Date(d).toLocaleDateString() : "—";
    },
  },
  {
    accessorKey: "totalGenerated",
    header: "Generated",
    cell: ({ row }) => row.original.totalGenerated,
  },
  {
    accessorKey: "_count.lineTemplates",
    header: "Lines",
    cell: ({ row }) => row.original._count.lineTemplates,
  },
];

export default function RecurringEntriesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.recurringEntry.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recurring Entries
          </h1>
          <p className="text-sm text-muted-foreground">
            Template-based journal entries generated on a schedule
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/accounting/recurring-entries/new">
            <Plus className="mr-2 h-4 w-4" /> New Recurring Entry
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as RecurringRow[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search recurring entries..."
          onRowClick={(row) =>
            router.push(`/finance/accounting/recurring-entries/${row.id}`)
          }
        />
      )}
    </div>
  );
}
