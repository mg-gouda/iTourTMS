"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, X } from "lucide-react";
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
import { trpc } from "@/lib/trpc";

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

const columns: ColumnDef<GuestRow>[] = [
  {
    id: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
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
    header: "Email",
    cell: ({ row }) => row.original.email ?? "—",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone ?? "—",
  },
  {
    accessorKey: "nationality",
    header: "Nationality",
    cell: ({ row }) => row.original.country?.name ?? row.original.nationality ?? "—",
  },
  {
    accessorKey: "passportNo",
    header: "Passport",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.passportNo ?? "—"}
      </span>
    ),
  },
  {
    id: "bookings",
    header: "Bookings",
    cell: ({ row }) => row.original._count.bookingGuests,
  },
];

export default function GuestsPage() {
  const router = useRouter();
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
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Guests</SelectItem>
          <SelectItem value="VIP">VIP Only</SelectItem>
          <SelectItem value="REGULAR">Regular</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => setVipFilter("ALL")}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Guests</h1>
          <p className="text-muted-foreground">
            Guest master data and booking history
          </p>
        </div>
        <Button asChild>
          <Link href="/reservations/guests/new">
            <Plus className="mr-2 size-4" /> New Guest
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
  );
}
