"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

const columns: ColumnDef<PartnerRow, unknown>[] = [
  {
    id: "name",
    accessorFn: (row) => row.name,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <Link href={`/finance/customers/${row.original.id}`} className="flex items-center gap-2 hover:underline font-medium">
        {row.original.isCompany ? <Building2 className="size-3.5 text-muted-foreground" /> : <User className="size-3.5 text-muted-foreground" />}
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.getValue("email") || "—",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.getValue("phone") || "—",
  },
  {
    id: "country",
    accessorFn: (row) => row.country?.name ?? "—",
    header: "Country",
  },
  {
    id: "paymentTerm",
    accessorFn: (row) => row.paymentTerm?.name ?? "—",
    header: "Payment Terms",
  },
  {
    id: "type",
    accessorFn: (row) => (row.isCompany ? "Company" : "Individual"),
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.isCompany ? "Company" : "Individual"}
      </Badge>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>
        {row.getValue("isActive") ? "Active" : "Archived"}
      </Badge>
    ),
  },
];

function fmt(v: number) {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = trpc.finance.partner.list.useQuery({
    type: "customer",
    search: search || undefined,
  });
  const { data: stats, isLoading: statsLoading } = trpc.finance.partner.getAggregateStats.useQuery({
    partnerType: "customer",
  });

  const statCards = [
    { label: "Sales",        primary: stats?.salesCount ?? 0,           secondary: stats ? fmt(stats.salesAmount) : null,     isCount: true },
    { label: "Invoiced",     primary: stats ? fmt(stats.invoicedAmount) : "—",    secondary: null,                                      isCount: false },
    { label: "Vendor Bills", primary: stats ? fmt(stats.vendorBillsAmount) : "—", secondary: null,                                      isCount: false },
    { label: "Due",          primary: stats ? fmt(stats.dueAmount) : "—",         secondary: null,                                      isCount: false, warn: (stats?.dueAmount ?? 0) > 0 },
    { label: "Purchases",    primary: stats?.purchasesCount ?? 0,        secondary: stats ? fmt(stats.purchasesAmount) : null, isCount: true },
    { label: "Contracts",    primary: stats?.contractsCount ?? 0,        secondary: null,                                      isCount: true },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/finance/customers/new">
            <Plus className="size-4 mr-2" />
            New Customer
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
          placeholder="Search by name, email, phone, tax ID..."
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
  );
}
