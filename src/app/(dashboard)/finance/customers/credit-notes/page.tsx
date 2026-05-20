"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
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
  partner: { name: string } | null;
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
    id: "partner",
    accessorFn: (row) => row.partner?.name ?? "—",
    header: "Customer",
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => new Date(row.getValue("date")).toLocaleDateString(),
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
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/finance/customers/credit-notes/${row.original.id}`}>
              View
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function CreditNotesPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.finance.move.list.useQuery({
    moveType: "OUT_REFUND",
  });

  return (
    <PermissionGuard permission="finance:partner:read">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("creditNotes")}</h1>
          <p className="text-muted-foreground">
            {t("creditNotesDesc")}
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/customers/credit-notes/new">{t("newCreditNote")}</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.items as any) ?? []}
          searchKey="name"
          searchPlaceholder="Search credit notes..."
          onRowClick={(row) =>
            router.push(`/finance/customers/credit-notes/${row.id}`)
          }
        />
      )}
    </div>
    </PermissionGuard>
  );
}
