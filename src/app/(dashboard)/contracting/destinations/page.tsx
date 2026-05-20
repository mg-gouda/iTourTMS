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

type DestRow = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  country: { id: string; name: string; code: string } | null;
  _count: { hotels: number; cities: number };
};

export default function DestinationsPage() {
  const t = useTranslations("contracting");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.destination.list.useQuery();

  const [countryFilter, setCountryFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const columns: ColumnDef<DestRow>[] = [
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
      accessorKey: "code",
      header: tc("code"),
      cell: ({ row }) => (
        <span className="font-mono">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "country",
      header: t("country"),
      cell: ({ row }) => row.original.country?.name ?? "—",
    },
    {
      id: "cities",
      header: t("citiesCol"),
      cell: ({ row }) => row.original._count.cities,
    },
    {
      id: "hotels",
      header: t("hotelsCol"),
      cell: ({ row }) => row.original._count.hotels,
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

  const countries = useMemo(() => {
    const countryMap = new Map<string, string>();
    for (const d of (data ?? []) as DestRow[]) {
      if (d.country) countryMap.set(d.country.id, d.country.name);
    }
    return Array.from(countryMap.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [data]);

  const filteredData = useMemo(() => {
    let result = (data ?? []) as DestRow[];
    if (countryFilter !== "ALL") {
      result = result.filter((d) => d.country?.id === countryFilter);
    }
    if (activeFilter !== "ALL") {
      result = result.filter((d) =>
        activeFilter === "ACTIVE" ? d.active : !d.active,
      );
    }
    return result;
  }, [data, countryFilter, activeFilter]);

  const hasFilters = countryFilter !== "ALL" || activeFilter !== "ALL";

  function clearFilters() {
    setCountryFilter("ALL");
    setActiveFilter("ALL");
  }

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={countryFilter} onValueChange={setCountryFilter}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder={t("country")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allCountries")}</SelectItem>
          {countries.map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-3 w-3" />
          {tc("clear")}
        </Button>
      )}
    </div>
  );

  return (
    <PermissionGuard permission="contracting:destination:read">
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">{t("destinations")}</h1>
          <p className="text-muted-foreground">
            {t("manageDestinations")}
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/destinations/new">
            <Plus className="mr-2 size-4" /> {t("newDestination")}
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
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
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
          searchPlaceholder={t("searchDestinations")}
          toolbar={filterToolbar}
          onRowClick={(row) =>
            router.push(`/contracting/destinations/${row.id}`)
          }
        />
      )}
    </div>
    </PermissionGuard>
  );
}
