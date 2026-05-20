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

type GuestRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  passportNo: string | null;
  isVip: boolean;
  country: { id: string; name: string; code: string } | null;
  _count: { bookingGuests: number };
};

function useColumns() {
  const t = useTranslations("reservations");
  const tc = useTranslations("common");
  const columns: ColumnDef<GuestRow>[] = [
  {
    id: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={tc("name")} />
    ),
    accessorFn: (row) => `${row.lastName}, ${row.firstName}`,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {row.original.lastName}, {row.original.firstName}
        </span>
        {row.original.isVip && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            VIP
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: tc("email"),
    cell: ({ row }) => row.original.email ?? "—",
  },
  {
    accessorKey: "phone",
    header: tc("phone"),
    cell: ({ row }) => row.original.phone ?? "—",
  },
  {
    accessorKey: "nationality",
    header: tc("nationality"),
    cell: ({ row }) => row.original.country?.name ?? row.original.nationality ?? "—",
  },
  {
    accessorKey: "passportNo",
    header: t("passport"),
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.passportNo ?? "—"}
      </span>
    ),
  },
  {
    id: "bookings",
    header: t("bookings"),
    cell: ({ row }) => row.original._count.bookingGuests,
  },
  ];
  return columns;
}

export default function GuestsPage() {
  const router = useRouter();
  const t = useTranslations("reservations");
  const tc = useTranslations("common");
  const columns = useColumns();
  const { data, isLoading } = trpc.reservations.guest.list.useQuery();

  const [vipFilter, setVipFilter] = useState("ALL");

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((g) => {
      if (vipFilter === "VIP" && !g.isVip) return false;
      if (vipFilter === "REGULAR" && g.isVip) return false;
      return true;
    });
  }, [data, vipFilter]);

  const hasFilters = vipFilter !== "ALL";

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={vipFilter} onValueChange={setVipFilter}>
        <SelectTrigger className="h-8 w-[130px]">
          <SelectValue placeholder={tc("type")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allGuests")}</SelectItem>
          <SelectItem value="VIP">{t("vipOnly")}</SelectItem>
          <SelectItem value="REGULAR">{t("regularGuests")}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => setVipFilter("ALL")}>
          <X className="mr-1 h-3 w-3" />
          {tc("clear")}
        </Button>
      )}
    </div>
  );

  return (
    <PermissionGuard permission="reservations:guest:read">
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">{t("guests")}</h1>
          <p className="text-muted-foreground">
            {t("guestMasterData")}
          </p>
        </div>
        <Button asChild>
          <Link href="/reservations/guests/new">
            <Plus className="mr-2 size-4" /> {t("newGuest")}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData as GuestRow[]}
          searchKey="name"
          searchPlaceholder="Search guests..."
          toolbar={filterToolbar}
          onRowClick={(row) =>
            router.push(`/reservations/guests/${row.id}`)
          }
        />
      )}
    </div>
    </PermissionGuard>
  );
}
