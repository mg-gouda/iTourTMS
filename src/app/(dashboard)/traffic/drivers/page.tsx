"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_DRIVER_STATUS_LABELS, TT_DRIVER_STATUS_VARIANTS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type Driver = {
  id: string;
  status: string;
  licenseNumber: string | null;
  phone: string | null;
  user: { name: string | null; email: string };
  _count: { driverVehicles: number; assignments: number };
};

export default function DriversPage() {
  const t = useTranslations("traffic");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.driver.list.useQuery();

  const columns: ColumnDef<Driver>[] = [
    { id: "name", header: tCommon("name"), accessorFn: (row) => row.user.name ?? row.user.email },
    { id: "email", header: tCommon("email"), accessorFn: (row) => row.user.email },
    { accessorKey: "phone", header: tCommon("phone"), cell: ({ row }) => row.original.phone ?? "—" },
    { accessorKey: "licenseNumber", header: t("licenseNumber"), cell: ({ row }) => row.original.licenseNumber ?? "—" },
    {
      id: "status", header: tCommon("status"), accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge variant={(TT_DRIVER_STATUS_VARIANTS[row.original.status] ?? "secondary") as never}>
          {TT_DRIVER_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    { id: "vehicles", header: t("vehicles"), accessorFn: (row) => row._count.driverVehicles },
    { id: "assignments", header: t("trafficJobs"), accessorFn: (row) => row._count.assignments },
  ];

  return (

    <PermissionGuard permission="traffic:driver:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("drivers")}</h1>
          <p className="text-muted-foreground">{t("manageDriverRecords")}</p>
        </div>
        <Button asChild><Link href="/traffic/drivers/new"><Plus className="mr-2 h-4 w-4" />{t("newDriver")}</Link></Button>
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable columns={columns} data={(data ?? []) as Driver[]} onRowClick={(row) => router.push(`/traffic/drivers/${row.id}`)} />
      )}
    </div>
  

    </PermissionGuard>

  );
}
