"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, UserCheck, UserX, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { P } from "@/lib/constants/permissions";
import { trpc } from "@/lib/trpc";

const resetSchema = z.object({
  newPassword: z.string().min(8),
  passwordExpiresAt: z.string().optional(),
});
type ResetForm = z.input<typeof resetSchema>;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const { data: user, isLoading } = trpc.admin.user.getById.useQuery({ id });
  const { data: allRoles } = trpc.admin.role.list.useQuery();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const toggleActive = trpc.admin.user.toggleActive.useMutation({
    onSuccess: () => { toast.success(tc("updated")); utils.admin.user.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  const assignRole = trpc.admin.user.assignRole.useMutation({
    onSuccess: () => { toast.success(tc("updated")); utils.admin.user.getById.invalidate({ id }); setSelectedRoleId(""); },
    onError: (e) => toast.error(e.message),
  });

  const revokeRole = trpc.admin.user.revokeRole.useMutation({
    onSuccess: () => { toast.success(tc("updated")); utils.admin.user.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.admin.user.resetPassword.useMutation({
    onSuccess: () => { toast.success(tc("updated")); setShowResetDialog(false); utils.admin.user.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  const setPasswordExpiry = trpc.admin.user.setPasswordExpiry.useMutation({
    onSuccess: () => { toast.success(tc("updated")); utils.admin.user.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  const deleteUser = trpc.admin.user.delete.useMutation({
    onSuccess: () => { toast.success(tc("deleted")); router.push("/admin/users"); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", passwordExpiresAt: "" },
  });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }
  if (!user) return <p>User not found</p>;

  const assignedRoleIds = user.userRoles.map((ur) => ur.role.id);
  const availableRoles = (allRoles ?? []).filter((r) => !assignedRoleIds.includes(r.id));

  return (
    <PermissionGuard permission={P.SYSTEM_USER_READ}>
      <div className="animate-fade-in space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{user.name ?? user.email}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleActive.mutate({ id })}
              disabled={toggleActive.isPending}
            >
              {user.isActive ? <><UserX className="mr-1 h-4 w-4" /> {t("deactivate")}</> : <><UserCheck className="mr-1 h-4 w-4" /> {t("activate")}</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
              <KeyRound className="mr-1 h-4 w-4" /> {t("resetPassword")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>{tc("profile")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{tc("status")}</span>
              <Badge variant={user.isActive ? "default" : "destructive"}>{user.isActive ? t("active") : t("inactive")}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Locale</span>
              <span>{user.locale}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t("memberSince")}</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground shrink-0">Password Expires</span>
              <div className="flex items-center gap-2">
                {user.passwordExpiresAt && new Date(user.passwordExpiresAt) < new Date() && (
                  <Badge variant="destructive" className="text-xs">Expired</Badge>
                )}
                <Input
                  type="date"
                  className="h-7 w-40 text-xs"
                  defaultValue={user.passwordExpiresAt ? new Date(user.passwordExpiresAt).toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPasswordExpiry.mutate({
                      id,
                      passwordExpiresAt: val ? new Date(val).toISOString() : null,
                    });
                  }}
                />
                {user.passwordExpiresAt && (
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    title="Clear expiry"
                    onClick={() => setPasswordExpiry.mutate({ id, passwordExpiresAt: null })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("assignedRoles")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {user.userRoles.length === 0 && (
                <span className="text-sm text-muted-foreground">{t("noRoles")}</span>
              )}
              {user.userRoles.map((ur) => (
                <Badge key={ur.role.id} variant="secondary" className="gap-1 pr-1">
                  {ur.role.displayName}
                  <button
                    className="ml-1 rounded hover:bg-destructive/20 p-0.5"
                    onClick={() => revokeRole.mutate({ userId: id, roleId: ur.role.id })}
                    disabled={revokeRole.isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {availableRoles.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!selectedRoleId || assignRole.isPending}
                  onClick={() => selectedRoleId && assignRole.mutate({ userId: id, roleId: selectedRoleId })}
                >
                  {t("assign")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { if (confirm(tc("confirmDelete"))) deleteUser.mutate({ id }); }}
            disabled={deleteUser.isPending}
          >
            {t("deleteUser")}
          </Button>
        </div>

        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("resetPassword")}</DialogTitle></DialogHeader>
            <Form {...resetForm}>
              <form
                onSubmit={resetForm.handleSubmit((v) =>
                  resetPassword.mutate({
                    id,
                    newPassword: v.newPassword,
                    passwordExpiresAt: v.passwordExpiresAt ? new Date(v.passwordExpiresAt).toISOString() : null,
                  })
                )}
                className="space-y-4"
              >
                <FormField control={resetForm.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("newPassword")}</FormLabel>
                    <FormControl><Input {...field} type="password" placeholder="Min. 8 characters" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={resetForm.control} name="passwordExpiresAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Expires On <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setShowResetDialog(false)}>{tc("cancel")}</Button>
                  <Button type="submit" disabled={resetPassword.isPending}>
                    {resetPassword.isPending ? tc("saving") : t("resetPassword")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
