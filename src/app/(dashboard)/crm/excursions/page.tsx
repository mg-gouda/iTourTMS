"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CRM_ACTIVITY_CATEGORY_LABELS,
  CRM_PRODUCT_TYPE_LABELS,
  CRM_TRIP_MODE_LABELS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

type ExcursionRow = {
  id: string;
  code: string;
  name: string;
  productType: string;
  category: string;
  tripMode: string;
  active: boolean;
  _count: { programs: number; costSheets: number; ageGroups: number; addons: number };
};

export default function ExcursionsPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.crm.excursion.list.useQuery();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const columns: ColumnDef<ExcursionRow>[] = [
    {
      accessorKey: "code",
      header: tc("code"),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={tc("name")} />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "productType",
      header: t("productType"),
      cell: ({ row }) => CRM_PRODUCT_TYPE_LABELS[row.original.productType],
    },
    {
      accessorKey: "category",
      header: t("category"),
      cell: ({ row }) => CRM_ACTIVITY_CATEGORY_LABELS[row.original.category],
    },
    {
      accessorKey: "tripMode",
      header: t("tripMode"),
      cell: ({ row }) => CRM_TRIP_MODE_LABELS[row.original.tripMode],
    },
    {
      id: "costSheets",
      header: t("costSheets"),
      cell: ({ row }) => row.original._count.costSheets,
    },
    {
      accessorKey: "active",
      header: tc("status"),
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? tc("active") : tc("inactive")}
        </Badge>
      ),
    },
  ];

  const filtered = useMemo(() => {
    let rows = (data ?? []) as ExcursionRow[];
    if (typeFilter !== "all") rows = rows.filter((r) => r.productType === typeFilter);
    if (categoryFilter !== "all") rows = rows.filter((r) => r.category === categoryFilter);
    return rows;
  }, [data, typeFilter, categoryFilter]);

  const filterToolbar = (
    <>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={t("allTypes")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allTypes")}</SelectItem>
          {Object.entries(CRM_PRODUCT_TYPE_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="h-9 w-[170px]">
          <SelectValue placeholder={t("allCategories")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allCategories")}</SelectItem>
          {Object.entries(CRM_ACTIVITY_CATEGORY_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (

    <PermissionGuard permission="crm:excursion:read">
      <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("excursions")}</h1>
          <p className="text-muted-foreground">{t("activityAndTourCatalog")}</p>
        </div>
        <Button asChild>
          <Link href="/crm/excursions/new">
            <Plus className="mr-2 size-4" /> {t("newExcursion")}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="name"
          searchPlaceholder={t("searchExcursions")}
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/crm/excursions/${row.id}`)}
        />
      )}
    </div>


    </PermissionGuard>

  );
}
