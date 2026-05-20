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
import { STAR_RATING_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type HotelRow = {
  id: string;
  name: string;
  code: string;
  starRating: string;
  city: string;
  cityRel: { id: string; name: string; code: string } | null;
  active: boolean;
  country: { name: string } | null;
  destination: { name: string } | null;
  _count: { roomTypes: number };
};

export default function HotelsPage() {
  const t = useTranslations("contracting");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.hotel.list.useQuery();

  const [destinationFilter, setDestinationFilter] = useState("ALL");
  const [starFilter, setStarFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const columns: ColumnDef<HotelRow>[] = [
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
      accessorKey: "starRating",
      header: t("stars"),
      cell: ({ row }) =>
        STAR_RATING_LABELS[row.original.starRating] ?? row.original.starRating,
    },
    {
      id: "city",
      header: t("city"),
      cell: ({ row }) => row.original.cityRel?.name ?? row.original.city ?? "—",
    },
    {
      id: "country",
      header: t("country"),
      cell: ({ row }) => row.original.country?.name ?? "—",
    },
    {
      id: "destination",
      header: t("destination"),
      cell: ({ row }) => row.original.destination?.name ?? "—",
    },
    {
      id: "roomTypes",
      header: t("roomTypesCol"),
      cell: ({ row }) => row.original._count.roomTypes,
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

  const { destinations, starRatings } = useMemo(() => {
    const destSet = new Map<string, string>();
    const starSet = new Set<string>();
    for (const h of (data ?? []) as HotelRow[]) {
      if (h.destination) destSet.set(h.destination.name, h.destination.name);
      if (h.starRating) starSet.add(h.starRating);
    }
    return {
      destinations: Array.from(destSet.values()).sort(),
      starRatings: Array.from(starSet).sort(),
    };
  }, [data]);

  const filteredData = useMemo(() => {
    let result = (data ?? []) as HotelRow[];
    if (destinationFilter !== "ALL") {
      result = result.filter((h) => h.destination?.name === destinationFilter);
    }
    if (starFilter !== "ALL") {
      result = result.filter((h) => h.starRating === starFilter);
    }
    if (activeFilter !== "ALL") {
      result = result.filter((h) =>
        activeFilter === "ACTIVE" ? h.active : !h.active,
      );
    }
    return result;
  }, [data, destinationFilter, starFilter, activeFilter]);

  const hasFilters =
    destinationFilter !== "ALL" ||
    starFilter !== "ALL" ||
    activeFilter !== "ALL";

  function clearFilters() {
    setDestinationFilter("ALL");
    setStarFilter("ALL");
    setActiveFilter("ALL");
  }

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={destinationFilter} onValueChange={setDestinationFilter}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder={t("destination")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allDestinations")}</SelectItem>
          {destinations.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={starFilter} onValueChange={setStarFilter}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={t("stars")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allStars")}</SelectItem>
          {starRatings.map((s) => (
            <SelectItem key={s} value={s}>
              {STAR_RATING_LABELS[s] ?? s}
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
    <PermissionGuard permission="contracting:hotel:read">
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">{t("hotels")}</h1>
          <p className="text-muted-foreground">
            {t("manageHotels")}
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/hotels/new">
            <Plus className="mr-2 size-4" /> {t("newHotel")}
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
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
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
          searchPlaceholder={t("searchHotels")}
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/contracting/hotels/${row.id}`)}
        />
      )}
    </div>
    </PermissionGuard>
  );
}
