"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

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
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type MarkupRow = {
  id: string;
  name: string;
  markupType: string;
  value: { toString(): string };
  priority: number;
  active: boolean;
  contract: { name: string } | null;
  hotel: { name: string } | null;
  destination: { name: string } | null;
  market: { name: string } | null;
  tourOperator: { name: string } | null;
  _count: { tariffs: number };
  validFrom: Date | null;
  validTo: Date | null;
};

export default function MarkupRulesPage() {
  const t = useTranslations("contracting");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.markupRule.list.useQuery();

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  function scopeLabel(row: MarkupRow): string {
    if (row.contract) return `Contract: ${row.contract.name}`;
    if (row.hotel) return `Hotel: ${row.hotel.name}`;
    if (row.destination) return `Dest: ${row.destination.name}`;
    if (row.market) return `Market: ${row.market.name}`;
    if (row.tourOperator) return `TO: ${row.tourOperator.name}`;
    return "Global";
  }

  function typeLabelFn(type: string): string {
    switch (type) {
      case "PERCENTAGE":
        return t("percentage");
      case "FIXED_PER_NIGHT":
        return t("fixedPerNight");
      case "FIXED_PER_BOOKING":
        return t("fixedPerBooking");
      default:
        return type;
    }
  }

  const columns: ColumnDef<MarkupRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tc("name")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "markupType",
      header: t("markupType"),
      cell: ({ row }) => (
        <Badge variant="outline">{typeLabelFn(row.original.markupType)}</Badge>
      ),
    },
    {
      id: "value",
      header: tc("value"),
      cell: ({ row }) => {
        const val = parseFloat(row.original.value.toString());
        return row.original.markupType === "PERCENTAGE"
          ? `${val}%`
          : val.toFixed(2);
      },
    },
    {
      id: "scope",
      header: t("scopeLabel"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {scopeLabel(row.original)}
        </span>
      ),
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("priority")} />
      ),
    },
    {
      id: "tariffs",
      header: t("tarifsCount"),
      cell: ({ row }) => row.original._count.tariffs,
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

  const filteredData = useMemo(() => {
    let result = (data ?? []) as MarkupRow[];
    if (activeFilter !== "ALL") {
      result = result.filter((r) =>
        activeFilter === "ACTIVE" ? r.active : !r.active,
      );
    }
    if (typeFilter !== "ALL") {
      result = result.filter((r) => r.markupType === typeFilter);
    }
    return result;
  }, [data, activeFilter, typeFilter]);

  const hasFilters = activeFilter !== "ALL" || typeFilter !== "ALL";

  const clearFilters = () => {
    setActiveFilter("ALL");
    setTypeFilter("ALL");
  };

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={activeFilter} onValueChange={setActiveFilter}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder={tc("status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allStatus")}</SelectItem>
          <SelectItem value="ACTIVE">{tc("active")}</SelectItem>
          <SelectItem value="INACTIVE">{tc("inactive")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={t("markupType")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allTypes")}</SelectItem>
          <SelectItem value="PERCENTAGE">{t("percentage")}</SelectItem>
          <SelectItem value="FIXED_PER_NIGHT">{t("fixedPerNight")}</SelectItem>
          <SelectItem value="FIXED_PER_BOOKING">{t("fixedPerBooking")}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-3 w-3" />
          {tc("clear")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">{t("markupRules")}</h1>
          <p className="text-muted-foreground">
            {t("markupRulesDesc")}
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/markups/new">
            <Plus className="mr-2 size-4" /> {tc("new")}
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
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchKey="name"
          searchPlaceholder={t("searchMarkupRules")}
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/contracting/markups/${row.id}`)}
        />
      )}
    </div>
  );
}
