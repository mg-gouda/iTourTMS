"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { X } from "lucide-react";
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

type StopSaleRow = {
  id: string;
  contractId: string;
  dateFrom: string | Date;
  dateTo: string | Date;
  reason: string | null;
  contract: {
    id: string;
    name: string;
    code: string;
    hotel: { id: string; name: string };
  };
  roomType: { id: string; name: string; code: string } | null;
};

export default function StopSalesPage() {
  const t = useTranslations("contracting");
  const tc = useTranslations("common");
  const [hotelId, setHotelId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data, isLoading } = trpc.contracting.contractAllotment.allStopSales.useQuery({
    hotelId: hotelId === "ALL" ? undefined : hotelId,
  });

  const columns: ColumnDef<StopSaleRow>[] = [
    {
      id: "hotelName",
      accessorFn: (row) => row.contract.hotel.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("hotel")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.contract.hotel.name}</span>
      ),
    },
    {
      id: "contractName",
      accessorFn: (row) => row.contract.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("contract")} />
      ),
      cell: ({ row }) => (
        <span>{row.original.contract.name}</span>
      ),
    },
    {
      id: "roomType",
      header: t("roomType"),
      cell: ({ row }) =>
        row.original.roomType ? (
          <span>{row.original.roomType.name}</span>
        ) : (
          <Badge variant="destructive" className="text-xs">
            {t("allRooms")}
          </Badge>
        ),
    },
    {
      accessorKey: "dateFrom",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tc("from")} />
      ),
      cell: ({ row }) => format(new Date(row.original.dateFrom), "dd MMM yyyy"),
    },
    {
      accessorKey: "dateTo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tc("to")} />
      ),
      cell: ({ row }) => format(new Date(row.original.dateTo), "dd MMM yyyy"),
    },
    {
      id: "status",
      header: tc("status"),
      cell: ({ row }) => {
        const now = new Date();
        const from = new Date(row.original.dateFrom);
        const to = new Date(row.original.dateTo);
        if (now < from) return <Badge variant="secondary">{t("upcomingLabel")}</Badge>;
        if (now > to) return <Badge variant="outline">{t("expiredLabel")}</Badge>;
        return <Badge variant="destructive">{t("activeLabel")}</Badge>;
      },
    },
    {
      accessorKey: "reason",
      header: t("reason"),
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[200px] inline-block">
          {row.original.reason || "—"}
        </span>
      ),
    },
  ];

  const filteredData = useMemo(() => {
    let result = (data ?? []) as StopSaleRow[];
    if (statusFilter !== "ALL") {
      const now = new Date();
      result = result.filter((ss) => {
        const from = new Date(ss.dateFrom);
        const to = new Date(ss.dateTo);
        if (statusFilter === "ACTIVE") return now >= from && now <= to;
        if (statusFilter === "UPCOMING") return now < from;
        if (statusFilter === "EXPIRED") return now > to;
        return true;
      });
    }
    return result;
  }, [data, statusFilter]);

  const hasFilters = hotelId !== "ALL" || statusFilter !== "ALL";

  const clearFilters = () => {
    setHotelId("ALL");
    setStatusFilter("ALL");
  };

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={hotelId} onValueChange={setHotelId}>
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder={t("hotel")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allHotels")}</SelectItem>
          {hotels?.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder={tc("status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allStatus")}</SelectItem>
          <SelectItem value="ACTIVE">{t("activeLabel")}</SelectItem>
          <SelectItem value="UPCOMING">{t("upcomingLabel")}</SelectItem>
          <SelectItem value="EXPIRED">{t("expiredLabel")}</SelectItem>
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
          <h1 className="text-2xl font-bold tracking-tight">{t("stopSales")}</h1>
          <p className="text-muted-foreground">
            {t("stopSalesDesc")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
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
          data={filteredData}
          searchKey="hotelName"
          searchPlaceholder={t("searchStopSales")}
          toolbar={filterToolbar}
        />
      )}
    </div>
  );
}
