"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus, ShieldCheck, ShieldOff } from "lucide-react";
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

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  createdAt: Date;
  userRoles: { role: { id: string; name: string; displayName: string } }[];
};

function useColumns() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const columns: ColumnDef<UserRow>[] = [
    { id: "name", header: tc("name"), accessorFn: (row) => row.name ?? row.email },
    { accessorKey: "email", header: tc("email") },
    {
      id: "roles",
      header: t("roles"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.userRoles.length === 0 ? (
            <span className="text-muted-foreground text-xs">{t("noRoles")}</span>
          ) : (
            row.original.userRoles.map((ur) => (
              <Badge key={ur.role.id} variant="secondary" className="text-xs">
                {ur.role.displayName}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: tc("status"),
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="default" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> {t("active")}
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <ShieldOff className="h-3 w-3" /> {t("inactive")}
          </Badge>
        ),
    },
    {
      id: "createdAt",
      header: tc("createdAt"),
      accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];
  return columns;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.admin.user.list.useQuery();
  const t = useTranslations("admin");
  const columns = useColumns();

  return (
    <PermissionGuard permission={P.SYSTEM_USER_READ}>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("users")}</h1>
            <p className="text-muted-foreground">{t("manageUsers")}</p>
          </div>
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus className="mr-2 h-4 w-4" /> {t("newUser")}
            </Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={(data ?? []) as UserRow[]}
            onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
          />

        )}
      </div>
    </PermissionGuard>
  );
}
