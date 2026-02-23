"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { BankStatementImportDialog } from "@/components/finance/bank-statement-import-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BANK_STATEMENT_STATE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type StatementRow = {
  id: string;
  name: string | null;
  state: string;
  date: string;
  balanceStart: number;
  balanceEnd: number;
  balanceEndReal: number;
  journal: { id: string; code: string; name: string };
  _count: { lines: number };
};

const columns: ColumnDef<StatementRow, unknown>[] = [
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
    accessorKey: "balanceStart",
    header: "Opening",
    cell: ({ row }) => (
      <span className="font-mono">
        {Number(row.getValue("balanceStart")).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "balanceEnd",
    header: "Closing",
    cell: ({ row }) => (
      <span className="font-mono">
        {Number(row.getValue("balanceEnd")).toFixed(2)}
      </span>
    ),
  },
  {
    id: "lines",
    accessorFn: (row) => row._count.lines,
    header: "Lines",
  },
  {
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.getValue("state") === "VALIDATED" ? "default" : "outline"}
      >
        {BANK_STATEMENT_STATE_LABELS[row.getValue("state") as string] ??
          row.getValue("state")}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <StatementActions statement={row.original} />,
  },
];

function StatementActions({ statement }: { statement: StatementRow }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.bankStatement.delete.useMutation({
    onSuccess: () => utils.finance.bankStatement.list.invalidate(),
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
          <Link href={`/finance/banking/statements/${statement.id}`}>View</Link>
        </DropdownMenuItem>
        {statement.state === "DRAFT" && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => deleteMutation.mutate({ id: statement.id })}
          >
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function BankStatementsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.bankStatement.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bank Statements
          </h1>
          <p className="text-muted-foreground">
            Manage bank and cash statement imports.
          </p>
        </div>
        <div className="flex gap-2">
          <BankStatementImportDialog />
          <Button asChild>
            <Link href="/finance/banking/statements/new">
              <Plus className="mr-2 size-4" />
              New Statement
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">
          Loading...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.items as any) ?? []}
          searchKey="name"
          searchPlaceholder="Search statements..."
          onRowClick={(row) =>
            router.push(`/finance/banking/statements/${row.id}`)
          }
        />
      )}
    </div>
  );
}
