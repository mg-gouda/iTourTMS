"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
import { PermissionGuard } from "@/components/shared/permission-guard";

type MoveRow = {
  id: string;
  name: string | null;
  state: string;
  date: string;
  amountTotal: number;
  ref: string | null;
  journal: { code: string; name: string };
};

export default function JournalEntriesPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.finance.move.list.useQuery({
    moveType: "ENTRY",
  });

  const columns: ColumnDef<MoveRow, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("number")} />
      ),
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.getValue("name") || tc("draft")}
        </span>
      ),
    },
    {
      id: "journal",
      accessorFn: (row) => `${row.journal.code} — ${row.journal.name}`,
      header: t("journal"),
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tc("date")} />
      ),
      cell: ({ row }) => new Date(row.getValue("date")).toLocaleDateString(),
    },
    {
      accessorKey: "ref",
      header: t("reference"),
      cell: ({ row }) => row.getValue("ref") || "—",
    },
    {
      accessorKey: "state",
      header: tc("status"),
      cell: ({ row }) => (
        <Badge variant={row.getValue("state") === "POSTED" ? "default" : "outline"}>
          {MOVE_STATE_LABELS[row.getValue("state") as string] ?? row.getValue("state")}
        </Badge>
      ),
    },
    {
      accessorKey: "amountTotal",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tc("total")} />
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
                  {tc("edit")}
                </Link>
              </DropdownMenuItem>
              {row.original.state === "DRAFT" && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                    deleteMutation.mutate({ id: row.original.id })
                  }
                >
                  {tc("delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <PermissionGuard permission="finance:move:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("journalEntries")}</h1>
          <p className="text-muted-foreground">
            {t("journalEntriesDesc")}
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/accounting/journal-entries/new">
            <Plus className="mr-2 size-4" />
            {t("newEntry")}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.items as any) ?? []}
          searchKey="name"
          searchPlaceholder={tc("search")}
          onRowClick={(row) =>
            router.push(`/finance/accounting/journal-entries/${row.id}`)
          }
        />
      )}
    </div>
    </PermissionGuard>
  );
}
