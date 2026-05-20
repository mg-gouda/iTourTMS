"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  loyaltyTier: string | null;
  lifetimeValue: unknown;
  partner: { id: string; name: string } | null;
  _count: { activities: number; opportunities: number; bookings: number };
};

const TIER_VARIANTS: Record<string, string> = {
  STANDARD: "secondary",
  SILVER: "default",
  GOLD: "warning",
  PLATINUM: "info",
};

export default function ContactsPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.crm.customer.list.useQuery();

  const columns: ColumnDef<CustomerRow>[] = [
    {
      id: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={tc("name")} />,
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: tc("email"),
      cell: ({ row }) => row.original.email ?? "—",
    },
    {
      accessorKey: "nationality",
      header: t("nationality"),
      cell: ({ row }) => row.original.nationality ?? "—",
    },
    {
      accessorKey: "loyaltyTier",
      header: t("loyaltyTier"),
      cell: ({ row }) => {
        const tier = row.original.loyaltyTier ?? "STANDARD";
        return (
          <Badge variant={TIER_VARIANTS[tier] as "default"}>{tier}</Badge>
        );
      },
    },
    {
      id: "lifetimeValue",
      header: t("lifetimeValue"),
      accessorFn: (row) => Number(row.lifetimeValue ?? 0),
      cell: ({ row }) => {
        const val = Number(row.original.lifetimeValue ?? 0);
        return val > 0 ? `$${val.toLocaleString()}` : "—";
      },
    },
    {
      id: "bookings",
      header: t("bookings"),
      cell: ({ row }) => row.original._count.bookings,
    },
    {
      id: "opportunities",
      header: t("opportunities"),
      cell: ({ row }) => row.original._count.opportunities,
    },
  ];

  return (

    <PermissionGuard permission="crm:customer:read">
      <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("contacts")}</h1>
          <p className="text-muted-foreground">{t("customer360")}</p>
        </div>
        <Button asChild>
          <Link href="/crm/contacts/new">
            <Plus className="mr-2 size-4" /> {t("newContact")}
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
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data ?? []) as CustomerRow[]}
          searchKey="name"
          searchPlaceholder={t("searchContacts")}
          onRowClick={(row) => router.push(`/crm/contacts/${row.id}`)}
        />
      )}
    </div>


    </PermissionGuard>

  );
}
