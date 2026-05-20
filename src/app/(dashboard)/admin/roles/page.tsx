"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Lock, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/lib/constants/permissions";
import { trpc } from "@/lib/trpc";

type RoleRow = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  _count: { userRoles: number; rolePermissions: number };
};

function useColumns() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const columns: ColumnDef<RoleRow>[] = [
    {
      id: "name",
      header: t("role"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isSystem && <Lock className="h-3 w-3 text-muted-foreground" />}
          <div>
            <p className="font-medium">{row.original.displayName}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.original.name}</p>
          </div>
        </div>
      ),
    },
    {
      id: "description",
      header: tc("description"),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.description ?? "—"}</span>,
    },
    {
      id: "type",
      header: tc("type"),
      cell: ({ row }) => (
        <Badge variant={row.original.isSystem ? "outline" : "secondary"}>
          {row.original.isSystem ? t("systemRole") : t("customRole")}
        </Badge>
      ),
    },
    { id: "users", header: t("users"), accessorFn: (row) => row._count.userRoles },
    { id: "permissions", header: t("permissions"), accessorFn: (row) => row._count.rolePermissions },
  ];
  return columns;
}

export default function AdminRolesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.admin.role.list.useQuery();
  const t = useTranslations("admin");
  const columns = useColumns();

  return (
    <PermissionGuard permission={P.SYSTEM_ROLE_READ}>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("roles")}</h1>
            <p className="text-muted-foreground">{t("manageRoles")}</p>
          </div>
          <Button asChild>
            <Link href="/admin/roles/new">
              <Plus className="mr-2 h-4 w-4" /> {t("newRole")}
            </Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={(data ?? []) as unknown as RoleRow[]}
            onRowClick={(row) => router.push(`/admin/roles/${row.id}`)}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
