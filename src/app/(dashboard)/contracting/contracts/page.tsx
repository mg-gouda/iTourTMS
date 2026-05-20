"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
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
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
  RATE_BASIS_LABELS,
} from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type ContractRow = {
  id: string;
  name: string;
  code: string;
  season: string | null;
  status: string;
  hotelId: string;
  validFrom: string | Date;
  validTo: string | Date;
  rateBasis: string;
  hotel: { id: string; name: string; city: string | null } | null;
  baseCurrency: { id: string; code: string; name: string } | null;
  markets: Array<{ market: { id: string; name: string; code: string } }>;
  _count: { seasons: number; roomTypes: number; mealBases: number };
};

export default function ContractsPage() {
  const t = useTranslations("contracting");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.contract.list.useQuery();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [hotelFilter, setHotelFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [seasonFilter, setSeasonFilter] = useState("ALL");
  const [marketFilter, setMarketFilter] = useState("ALL");

  const columns: ColumnDef<ContractRow>[] = [
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
      id: "hotel",
      header: t("hotel"),
      cell: ({ row }) => row.original.hotel?.name ?? "—",
    },
    {
      id: "period",
      header: t("period"),
      cell: ({ row }) => {
        const from = format(new Date(row.original.validFrom), "dd MMM yyyy");
        const to = format(new Date(row.original.validTo), "dd MMM yyyy");
        return `${from} — ${to}`;
      },
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
      accessorKey: "status",
      header: tc("status"),
      cell: ({ row }) => (
        <Badge
          variant={
            (CONTRACT_STATUS_VARIANTS[row.original.status] as
              | "default"
              | "secondary"
              | "outline"
              | "destructive") ?? "secondary"
          }
        >
          {CONTRACT_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
  ];

  // Derive unique hotels, currencies, cities, seasons, and markets from data
  const { hotels, currencies, cities, seasons, markets } = useMemo(() => {
    const hotelMap = new Map<string, string>();
    const currencyMap = new Map<string, string>();
    const citySet = new Set<string>();
    const seasonSet = new Set<string>();
    const marketMap = new Map<string, string>();
    for (const c of (data ?? []) as ContractRow[]) {
      if (c.hotel) hotelMap.set(c.hotel.id, c.hotel.name);
      if (c.baseCurrency) currencyMap.set(c.baseCurrency.code, c.baseCurrency.code);
      if (c.hotel?.city) citySet.add(c.hotel.city);
      if (c.season) seasonSet.add(c.season);
      for (const cm of c.markets ?? []) {
        marketMap.set(cm.market.id, cm.market.name);
      }
    }
    return {
      hotels: Array.from(hotelMap.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
      currencies: Array.from(currencyMap.keys()).sort(),
      cities: Array.from(citySet).sort(),
      seasons: Array.from(seasonSet).sort(),
      markets: Array.from(marketMap.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
    };
  }, [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    let result = (data ?? []) as ContractRow[];
    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (hotelFilter !== "ALL") {
      result = result.filter((c) => c.hotel?.id === hotelFilter);
    }
    if (currencyFilter !== "ALL") {
      result = result.filter((c) => c.baseCurrency?.code === currencyFilter);
    }
    if (cityFilter !== "ALL") {
      result = result.filter((c) => c.hotel?.city === cityFilter);
    }
    if (seasonFilter !== "ALL") {
      result = result.filter((c) => c.season === seasonFilter);
    }
    if (marketFilter !== "ALL") {
      result = result.filter((c) =>
        c.markets?.some((cm) => cm.market.id === marketFilter),
      );
    }
    return result;
  }, [data, statusFilter, hotelFilter, currencyFilter, cityFilter, seasonFilter, marketFilter]);

  const hasFilters =
    statusFilter !== "ALL" || hotelFilter !== "ALL" || currencyFilter !== "ALL" ||
    cityFilter !== "ALL" || seasonFilter !== "ALL" || marketFilter !== "ALL";

  function clearFilters() {
    setStatusFilter("ALL");
    setHotelFilter("ALL");
    setCurrencyFilter("ALL");
    setCityFilter("ALL");
    setSeasonFilter("ALL");
    setMarketFilter("ALL");
  }

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder={tc("status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allStatus")}</SelectItem>
          {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={hotelFilter} onValueChange={setHotelFilter}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder={t("hotel")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allHotels")}</SelectItem>
          {hotels.map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={cityFilter} onValueChange={setCityFilter}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={t("city")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allCities")}</SelectItem>
          {cities.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={seasonFilter} onValueChange={setSeasonFilter}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder={t("season")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allSeasons")}</SelectItem>
          {seasons.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder={tc("currency")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allCurrencies")}</SelectItem>
          {currencies.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={marketFilter} onValueChange={setMarketFilter}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={t("market")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allMarkets")}</SelectItem>
          {markets.map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
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
          <h1 className="text-2xl font-bold tracking-tight">{t("contracts")}</h1>
          <p className="text-muted-foreground">
            {t("manageContracts")}
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/contracts/new">
            <Plus className="mr-2 size-4" /> {t("newContract")}
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
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
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
          searchPlaceholder={t("searchContracts")}
          toolbar={filterToolbar}
          onRowClick={(row) =>
            router.push(`/contracting/contracts/${row.id}`)
          }
        />
      )}
    </div>
  );
}
