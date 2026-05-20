"use client";

import { ArrowLeft, Lock, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { P } from "@/lib/constants/permissions";
import { trpc } from "@/lib/trpc";
import { useTranslations } from "next-intl";

type RoleDetail = {
  id: string; name: string; displayName: string; description: string | null; isSystem: boolean;
  rolePermissions: { permission: { id: string; code: string; module: string; resource: string; action: string; displayName: string } }[];
  userRoles: { user: { id: string; name: string | null; email: string | null; image: string | null; isActive: boolean } }[];
};

// Group permissions by module and resource for the matrix UI
function groupPermissions(permissions: { id: string; code: string; module: string; resource: string; action: string; displayName: string }[]) {
  const grouped: Record<string, Record<string, { id: string; code: string; action: string }[]>> = {};
  for (const perm of permissions) {
    if (!grouped[perm.module]) grouped[perm.module] = {};
    if (!grouped[perm.module][perm.resource]) grouped[perm.module][perm.resource] = [];
    grouped[perm.module][perm.resource].push({ id: perm.id, code: perm.code, action: perm.action });
  }
  return grouped;
}

const ACTION_ORDER = ["read", "create", "update", "delete", "post", "confirm", "cancel", "manage", "export", "import", "reconcile", "publish"];

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const { data: roleRaw, isLoading: roleLoading } = trpc.admin.role.getById.useQuery({ id });
  const role = roleRaw as unknown as RoleDetail | undefined;
  const { data: allPermissions } = trpc.admin.permission.listAll.useQuery();

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const setPermissions = trpc.admin.role.setPermissions.useMutation({
    onSuccess: () => {
      toast.success(tc("saved"));
      setDirty(false);
      utils.admin.role.getById.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRole = trpc.admin.role.delete.useMutation({
    onSuccess: () => { toast.success(tc("deleted")); router.push("/admin/roles"); },
    onError: (e) => toast.error(e.message),
  });

  // Initialise checked state from role
  useEffect(() => {
    if (role) {
      setSelectedCodes(new Set(role.rolePermissions.map((rp) => rp.permission.code)));
      setDirty(false);
    }
  }, [role]);

  const grouped = useMemo(() => groupPermissions(allPermissions ?? []), [allPermissions]);
  const modules = Object.keys(grouped).sort();

  const isSuperAdmin = role?.name === "super_admin";

  function toggle(code: string) {
    if (isSuperAdmin) return;
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
    setDirty(true);
  }

  function toggleModule(module: string, checked: boolean) {
    if (isSuperAdmin) return;
    const codes = Object.values(grouped[module] ?? {}).flat().map((p) => p.code);
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => (checked ? next.add(c) : next.delete(c)));
      return next;
    });
    setDirty(true);
  }

  function handleSave() {
    setPermissions.mutate({ roleId: id, permissionCodes: Array.from(selectedCodes) });
  }

  if (roleLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }
  if (!role) return <p>Role not found</p>;

  return (
    <PermissionGuard permission={P.SYSTEM_ROLE_READ}>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/roles"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            {role.isSystem && <Lock className="h-4 w-4 text-muted-foreground" />}
            <div>
              <h1 className="text-2xl font-bold">{role.displayName}</h1>
              <p className="text-muted-foreground font-mono text-sm">{role.name}</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            {dirty && !isSuperAdmin && (
              <Button size="sm" onClick={handleSave} disabled={setPermissions.isPending}>
                <Save className="mr-1 h-4 w-4" />
                {setPermissions.isPending ? tc("saving") : t("savePermissions")}
              </Button>
            )}
            {!role.isSystem && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { if (confirm(tc("confirmDelete"))) deleteRole.mutate({ id }); }}
                disabled={deleteRole.isPending}
              >
                {t("deleteRole")}
              </Button>
            )}
          </div>
        </div>

        {role.description && (
          <p className="text-sm text-muted-foreground">{role.description}</p>
        )}

        <Tabs defaultValue="permissions">
          <TabsList>
            <TabsTrigger value="permissions">{t("permissions")} ({isSuperAdmin ? tc("all") : selectedCodes.size})</TabsTrigger>
            <TabsTrigger value="users">{t("users")} ({role.userRoles.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="mt-4">
            {isSuperAdmin ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Super Admin has all permissions by default. {t("systemRole")} permissions cannot be modified.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {modules.map((module) => {
                  const resources = grouped[module];
                  const allModuleCodes = Object.values(resources).flat().map((p) => p.code);
                  const checkedCount = allModuleCodes.filter((c) => selectedCodes.has(c)).length;
                  const moduleChecked = checkedCount === allModuleCodes.length;
                  const moduleIndeterminate = checkedCount > 0 && !moduleChecked;

                  return (
                    <Card key={module}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={moduleChecked}
                            data-state={moduleIndeterminate ? "indeterminate" : undefined}
                            onCheckedChange={(checked) => toggleModule(module, !!checked)}
                          />
                          <CardTitle className="text-base capitalize">{module.replace(/-/g, " ")}</CardTitle>
                          <Badge variant="outline" className="ml-auto text-xs">{checkedCount}/{allModuleCodes.length}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(resources).map(([resource, perms]) => {
                            const sortedPerms = [...perms].sort(
                              (a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action),
                            );
                            return (
                              <div key={resource} className="grid grid-cols-[140px_1fr] gap-2 items-start">
                                <span className="text-sm font-medium capitalize pt-1">{resource}</span>
                                <div className="flex flex-wrap gap-3">
                                  {sortedPerms.map((perm) => (
                                    <label key={perm.id} className="flex items-center gap-1.5 cursor-pointer">
                                      <Checkbox
                                        checked={selectedCodes.has(perm.code)}
                                        onCheckedChange={() => toggle(perm.code)}
                                      />
                                      <span className="text-xs capitalize">{perm.action}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardContent className="pt-4 space-y-2">
                {role.userRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noUsersInRole")}</p>
                ) : (
                  role.userRoles.map((ur) => (
                    <div key={ur.user.id} className="flex items-center gap-3 py-1">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ur.user.name ?? ur.user.email}</p>
                        <p className="text-xs text-muted-foreground">{ur.user.email}</p>
                      </div>
                      <Badge variant={ur.user.isActive ? "default" : "destructive"}>
                        {ur.user.isActive ? t("active") : t("inactive")}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/users/${ur.user.id}`}>{tc("view")}</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
