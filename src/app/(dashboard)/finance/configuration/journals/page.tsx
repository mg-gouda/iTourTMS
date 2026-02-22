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
import { JOURNAL_TYPE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type Journal = {
  id: string;
  code: string;
  name: string;
  type: string;
  defaultAccount: { name: string } | null;
  currency: { code: string } | null;
};

const columns: ColumnDef<Journal, unknown>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.getValue("code")}</span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">
        {JOURNAL_TYPE_LABELS[row.getValue("type") as string] ??
          row.getValue("type")}
      </Badge>
    ),
  },
  {
    id: "defaultAccount",
    accessorFn: (row) => row.defaultAccount?.name ?? "—",
    header: "Default Account",
  },
  {
    id: "currency",
    accessorFn: (row) => row.currency?.code ?? "—",
    header: "Currency",
  },
  {
    id: "actions",
    cell: ({ row }) => <JournalActions journal={row.original} />,
  },
];

function JournalActions({ journal }: { journal: Journal }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.journal.delete.useMutation({
    onSuccess: () => utils.finance.journal.list.invalidate(),
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
          <Link href={`/finance/configuration/journals/${journal.id}`}>
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => deleteMutation.mutate({ id: journal.id })}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function JournalsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.journal.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journals</h1>
          <p className="text-muted-foreground">
            Manage accounting journals for posting entries.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/configuration/journals/new">
            <Plus className="mr-2 size-4" />
            New Journal
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">
          Loading...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          searchKey="name"
          searchPlaceholder="Search journals..."
          onRowClick={(row) =>
            router.push(`/finance/configuration/journals/${row.id}`)
          }
        />
      )}
    </div>
  );
}
