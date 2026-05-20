"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { RATE_BASIS_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type TemplateRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  hotelId: string;
  validFrom: string | Date;
  validTo: string | Date;
  rateBasis: string;
  createdAt: string | Date;
  hotel: { id: string; name: string } | null;
  baseCurrency: { id: string; code: string; name: string } | null;
  _count: { seasons: number; roomTypes: number; mealBases: number };
};

export default function TemplatesPage() {
  const t = useTranslations("contracting");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.contract.listTemplates.useQuery();

  const columns: ColumnDef<TemplateRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tc("name")} />
      ),
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            {t("template")}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: tc("code"),
      cell: ({ row }) => (
        <span className="font-mono">{row.original.code}</span>
      ),
    },
    {
      id: "hotel",
      header: t("hotel"),
      cell: ({ row }) => row.original.hotel?.name ?? "—",
    },
    {
      id: "currency",
      header: tc("currency"),
      cell: ({ row }) => row.original.baseCurrency?.code ?? "—",
    },
    {
      accessorKey: "rateBasis",
      header: t("rateBasisCol"),
      cell: ({ row }) =>
        RATE_BASIS_LABELS[row.original.rateBasis] ?? row.original.rateBasis,
    },
    {
      id: "seasons",
      header: t("seasonsCol"),
      cell: ({ row }) => row.original._count.seasons,
    },
    {
      id: "roomTypes",
      header: t("roomTypesCol"),
      cell: ({ row }) => row.original._count.roomTypes,
    },
    {
      id: "created",
      header: t("created"),
      cell: ({ row }) =>
        format(new Date(row.original.createdAt), "dd MMM yyyy"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("contractTemplates")}
          </h1>
          <p className="text-muted-foreground">
            {t("contractTemplatesDesc")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">
          {tc("loading")}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as TemplateRow[]) ?? []}
          searchKey="name"
          searchPlaceholder={t("searchTemplates")}
          onRowClick={(row) =>
            router.push(`/contracting/contracts/${row.id}`)
          }
        />
      )}
    </div>
  );
}
