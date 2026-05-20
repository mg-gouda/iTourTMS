"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { trpc } from "@/lib/trpc";

type PartnerRow = {
  id: string;
  name: string;
  isCompany: boolean;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  isActive: boolean;
  country: { id: string; name: string } | null;
  paymentTerm: { id: string; name: string } | null;
};

function buildColumns(t: ReturnType<typeof useTranslations<"finance">>, tc: ReturnType<typeof useTranslations<"common">>): ColumnDef<PartnerRow, unknown>[] {
  return [
  {
    id: "name",
    accessorFn: (row) => row.name,
    header: ({ column }) => <DataTableColumnHeader column={column} title={tc("name")} />,
    cell: ({ row }) => (
      <Link href={`/finance/customers/${row.original.id}`} className="flex items-center gap-2 hover:underline font-medium">
        {row.original.isCompany ? <Building2 className="size-3.5 text-muted-foreground" /> : <User className="size-3.5 text-muted-foreground" />}
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "email",
    header: tc("email"),
    cell: ({ row }) => row.getValue("email") || "—",
  },
  {
    accessorKey: "phone",
    header: tc("phone"),
    cell: ({ row }) => row.getValue("phone") || "—",
  },
  {
    id: "country",
    accessorFn: (row) => row.country?.name ?? "—",
    header: tc("country") as string,
  },
  {
    id: "paymentTerm",
    accessorFn: (row) => row.paymentTerm?.name ?? "—",
    header: t("paymentTerms"),
  },
  {
    id: "type",
    accessorFn: (row) => (row.isCompany ? t("company") : t("individual")),
    header: tc("type") as string,
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.isCompany ? t("company") : t("individual")}
      </Badge>
    ),
  },
  {
    accessorKey: "isActive",
    header: tc("status") as string,
    cell: ({ row }) => (
      <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>
        {row.getValue("isActive") ? tc("active") : t("archived")}
      </Badge>
    ),
  },
];
}

function fmt(v: number) {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomersPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = trpc.finance.partner.list.useQuery({
    type: "customer",
    search: search || undefined,
  });
  const { data: stats, isLoading: statsLoading } = trpc.finance.partner.getAggregateStats.useQuery({
    partnerType: "customer",
  });

  const columns = buildColumns(t, tc);

  const statCards = [
    { label: t("sales"),           primary: stats?.salesCount ?? 0,           secondary: stats ? fmt(stats.salesAmount) : null,     isCount: true },
    { label: t("invoiced"),        primary: stats ? fmt(stats.invoicedAmount) : "—",    secondary: null,                                      isCount: false },
    { label: t("vendorBillsStat"), primary: stats ? fmt(stats.vendorBillsAmount) : "—", secondary: null,                                      isCount: false },
    { label: t("due"),             primary: stats ? fmt(stats.dueAmount) : "—",         secondary: null,                                      isCount: false, warn: (stats?.dueAmount ?? 0) > 0 },
    { label: t("purchases"),       primary: stats?.purchasesCount ?? 0,        secondary: stats ? fmt(stats.purchasesAmount) : null, isCount: true },
    { label: t("contracts"),       primary: stats?.contractsCount ?? 0,        secondary: null,                                      isCount: true },
  ];

  return (
    <PermissionGuard permission="finance:partner:read">
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("customers")}</h1>
          <p className="text-sm text-muted-foreground">{customers.length} {t("customer")}{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/finance/customers/new">
            <Plus className="size-4 mr-2" />
            {t("newCustomer")}
          </Link>
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {statCards.map(({ label, primary, secondary, isCount, warn }) => (
          <Card key={label} className="py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{label}</p>
              {statsLoading ? (
                <Skeleton className="h-4 w-14" />
              ) : (
                <>
                  <p className={`text-sm font-bold leading-tight ${!isCount ? "font-mono" : ""} ${warn ? "text-destructive" : ""}`}>
                    {primary}
                  </p>
                  {secondary && (
                    <p className="text-[10px] text-muted-foreground font-mono">{secondary}</p>
                  )}
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t("searchByName")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={customers as PartnerRow[]}
        isLoading={isLoading}
      />
    </div>
    </PermissionGuard>
  );
}
