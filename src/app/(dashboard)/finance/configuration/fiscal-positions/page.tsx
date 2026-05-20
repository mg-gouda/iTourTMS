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
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FiscalPositionRow = {
  id: string;
  name: string;
  autoApply: boolean;
  vatRequired: boolean;
  isActive: boolean;
  country: { id: string; name: string } | null;
  _count: { taxMaps: number; accountMaps: number };
};

function FPActions({ fp }: { fp: FiscalPositionRow }) {
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.fiscalPosition.delete.useMutation({
    onSuccess: () => utils.finance.fiscalPosition.list.invalidate(),
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
          <Link href={`/finance/configuration/fiscal-positions/${fp.id}`}>
            {tc("edit")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => deleteMutation.mutate({ id: fp.id })}
        >
          {tc("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function FiscalPositionsPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.finance.fiscalPosition.list.useQuery();

  const columns: ColumnDef<FiscalPositionRow, unknown>[] = [
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
      id: "country",
      accessorFn: (row) => row.country?.name ?? "—",
      header: t("country"),
    },
    {
      accessorKey: "autoApply",
      header: t("autoApply"),
      cell: ({ row }) => (
        <Badge variant={row.getValue("autoApply") ? "default" : "outline"}>
          {row.getValue("autoApply") ? tc("yes") : tc("no")}
        </Badge>
      ),
    },
    {
      accessorKey: "vatRequired",
      header: t("vatRequired"),
      cell: ({ row }) => (row.getValue("vatRequired") ? tc("yes") : tc("no")),
    },
    {
      id: "mappings",
      header: t("mappings"),
      cell: ({ row }) => {
        const c = row.original._count;
        return `${c.taxMaps} ${t("tax")}, ${c.accountMaps} ${t("accountName")}`;
      },
    },
    {
      accessorKey: "isActive",
      header: tc("active"),
      cell: ({ row }) => (
        <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>
          {row.getValue("isActive") ? tc("active") : tc("inactive")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <FPActions fp={row.original} />,
    },
  ];

  return (
    <PermissionGuard permission="finance:settings:manage">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("fiscalPositions")}
          </h1>
          <p className="text-muted-foreground">
            {t("fiscalPositionsDesc")}
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/configuration/fiscal-positions/new">
            <Plus className="mr-2 size-4" />
            {t("newFiscalPosition")}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">
          {tc("loading")}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as any) ?? []}
          searchKey="name"
          searchPlaceholder={tc("search")}
          onRowClick={(row) =>
            router.push(`/finance/configuration/fiscal-positions/${row.id}`)
          }
        />
      )}
    </div>
    </PermissionGuard>
  );
}
