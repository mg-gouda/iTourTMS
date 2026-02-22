"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOVE_STATE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type MoveRow = {
  id: string;
  name: string | null;
  state: string;
  date: string;
  amountTotal: number;
  ref: string | null;
  journal: { code: string; name: string };
};

const columns: ColumnDef<MoveRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Number" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.getValue("name") || "Draft"}
      </span>
    ),
  },
  {
    id: "journal",
    accessorFn: (row) => `${row.journal.code} — ${row.journal.name}`,
    header: "Journal",
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => new Date(row.getValue("date")).toLocaleDateString(),
  },
  {
    accessorKey: "ref",
    header: "Reference",
    cell: ({ row }) => row.getValue("ref") || "—",
  },
  {
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("state") === "POSTED" ? "default" : "outline"}>
        {MOVE_STATE_LABELS[row.getValue("state") as string] ?? row.getValue("state")}
      </Badge>
    ),
  },
  {
    accessorKey: "amountTotal",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">
        {Number(row.getValue("amountTotal")).toFixed(2)}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const utils = trpc.useUtils();
      const deleteMutation = trpc.finance.move.delete.useMutation({
        onSuccess: () => utils.finance.move.list.invalidate(),
      });
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                href={`/finance/accounting/journal-entries/${row.original.id}`}
              >
                Edit
              </Link>
            </DropdownMenuItem>
            {row.original.state === "DRAFT" && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  deleteMutation.mutate({ id: row.original.id })
                }
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function JournalEntriesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.move.list.useQuery({
    moveType: "ENTRY",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground">
            Manual journal entries and adjustments.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/accounting/journal-entries/new">
            <Plus className="mr-2 size-4" />
            New Entry
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.items as any) ?? []}
          searchKey="name"
          searchPlaceholder="Search entries..."
          onRowClick={(row) =>
            router.push(`/finance/accounting/journal-entries/${row.id}`)
          }
        />
      )}
    </div>
  );
}
