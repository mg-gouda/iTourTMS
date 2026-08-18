"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, KeyRound, Link2, LockOpen, Plus, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PARTNER_ROLE_LABELS } from "@/lib/constants/b2b-portal";
import { trpc } from "@/lib/trpc";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PARTNER_PASSWORD_HINT =
  "At least 12 characters, with upper case, lower case and a number.";

const partnerPassword = z
  .string()
  .min(12, "Minimum 12 characters")
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), {
    message: "Include upper case, lower case and a number",
  });

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  partnerRole: z.enum(["PARTNER_ADMIN", "PARTNER_AGENT", "PARTNER_ACCOUNTANT"]),
  tourOperatorId: z.string().min(1, "Partner is required"),
  isActive: z.boolean().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

const resetPasswordSchema = z.object({ newPassword: partnerPassword });
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type PartnerUserRow = {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  partnerRole: "PARTNER_ADMIN" | "PARTNER_AGENT" | "PARTNER_ACCOUNTANT" | null;
  twoFactorEnabled: boolean;
  mustSetPassword: boolean;
  lockedUntil: Date | null;
  tourOperator: { id: string; name: string; code: string; portalEnabled: boolean } | null;
  createdAt: Date;
};

/** One line that says whether this login can actually get in right now. */
function accessState(row: PartnerUserRow) {
  if (!row.isActive) return { label: "Disabled", variant: "secondary" as const };
  if (row.lockedUntil && new Date(row.lockedUntil) > new Date())
    return { label: "Locked out", variant: "destructive" as const };
  if (row.mustSetPassword) return { label: "Invite pending", variant: "outline" as const };
  if (!row.twoFactorEnabled) return { label: "2FA not set up", variant: "outline" as const };
  if (!row.tourOperator?.portalEnabled)
    return { label: "Portal off", variant: "secondary" as const };
  return { label: "Ready", variant: "default" as const };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PartnerUsersPage() {
  const utils = trpc.useUtils();
  const t = useTranslations("b2bPortal");
  const tc = useTranslations("common");
  const { data, isLoading } = trpc.b2bPortal.partnerUser.list.useQuery();
  const { data: tourOperators } = trpc.b2bPortal.tourOperator.list.useQuery();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string; userName: string }>(
    { open: false, userId: "", userName: "" },
  );
  const [invite, setInvite] = useState<{ email: string; url: string; days: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = () => utils.b2bPortal.partnerUser.list.invalidate();

  // -- Create form --
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      email: "",
      partnerRole: "PARTNER_AGENT",
      tourOperatorId: "",
      isActive: true,
    },
  });

  const createMutation = trpc.b2bPortal.partnerUser.create.useMutation({
    onSuccess: (user) => {
      refresh();
      closeDialog();
      // A partner login is useless until it has a password and an
      // authenticator, so the invite goes out in the same breath.
      inviteMutation.mutate({ userId: user.id });
    },
  });

  const inviteMutation = trpc.b2bPortal.portalAccess.createInvite.useMutation({
    onSuccess: (r) => setInvite({ email: r.email, url: r.url, days: r.expiresInDays }),
  });

  function closeDialog() {
    setDialogOpen(false);
    form.reset();
  }

  const toggleMutation = trpc.b2bPortal.partnerUser.toggleActive.useMutation({ onSuccess: refresh });
  const roleMutation = trpc.b2bPortal.partnerUser.setRole.useMutation({ onSuccess: refresh });
  const unlockMutation = trpc.b2bPortal.partnerUser.unlock.useMutation({ onSuccess: refresh });
  const twoFactorMutation = trpc.b2bPortal.partnerUser.resetTwoFactor.useMutation({
    onSuccess: refresh,
  });

  // -- Reset password form --
  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  const resetMutation = trpc.b2bPortal.partnerUser.resetPassword.useMutation({
    onSuccess: () => {
      setResetDialog({ open: false, userId: "", userName: "" });
      resetForm.reset();
    },
  });

  // -- Columns --
  const columns: ColumnDef<PartnerUserRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title={tc("name")} />,
        cell: ({ row }) => <span className="font-medium">{row.original.name ?? "—"}</span>,
      },
      { accessorKey: "email", header: tc("email") },
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }) => {
          const to = row.original.tourOperator;
          if (!to) return "—";
          return (
            <span>
              {to.name}{" "}
              <span className="text-muted-foreground font-mono text-xs">({to.code})</span>
            </span>
          );
        },
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => (
          <Select
            value={row.original.partnerRole ?? "PARTNER_AGENT"}
            onValueChange={(v) => {
              if (!v) return;
              roleMutation.mutate({
                id: row.original.id,
                partnerRole: v as PartnerUserRow["partnerRole"] & string,
              });
            }}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PARTNER_ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "access",
        header: "Portal access",
        cell: ({ row }) => {
          const state = accessState(row.original);
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.original.isActive}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: row.original.id, isActive: checked })
                }
                disabled={toggleMutation.isPending}
              />
              <Badge variant={state.variant}>{state.label}</Badge>
            </div>
          );
        },
      },
      {
        id: "created",
        header: tc("createdAt"),
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                Manage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => inviteMutation.mutate({ userId: row.original.id })}>
                <Link2 className="mr-2 size-3.5" /> Send invitation link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setResetDialog({
                    open: true,
                    userId: row.original.id,
                    userName: row.original.name ?? row.original.email,
                  })
                }
              >
                <KeyRound className="mr-2 size-3.5" /> {t("resetPassword")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => twoFactorMutation.mutate({ id: row.original.id })}
                disabled={!row.original.twoFactorEnabled}
              >
                <ShieldOff className="mr-2 size-3.5" /> Reset two-factor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => unlockMutation.mutate({ id: row.original.id })}
                disabled={!row.original.lockedUntil}
              >
                <LockOpen className="mr-2 size-3.5" /> Unlock account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggleMutation.isPending, roleMutation.isPending],
  );

  // -- Filtering --
  const filtered = useMemo(() => {
    let rows = (data ?? []) as PartnerUserRow[];
    if (statusFilter === "active") rows = rows.filter((r) => r.isActive);
    if (statusFilter === "inactive") rows = rows.filter((r) => !r.isActive);
    if (statusFilter === "pending")
      rows = rows.filter((r) => r.mustSetPassword || !r.twoFactorEnabled);
    return rows;
  }, [data, statusFilter]);

  return (
    <PermissionGuard permission="b2b-portal:partnerUser:read">
      <div className="animate-fade-in space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("partnerUsers")}</h1>
            <p className="text-muted-foreground">{t("partnerUsersDesc")}</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 size-4" /> {t("newPartnerUser")}
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
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            searchKey="name"
            searchPlaceholder={`${tc("search")} ${t("partnerUsers").toLowerCase()}...`}
            toolbar={
              <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                <SelectTrigger className="h-9 w-[170px]">
                  <SelectValue placeholder={t("allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  <SelectItem value="active">{tc("active")}</SelectItem>
                  <SelectItem value="inactive">{tc("inactive")}</SelectItem>
                  <SelectItem value="pending">Not signed in yet</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        )}

        {/* ---- Create partner user ---- */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("newPartnerUser")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tc("name")}</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tc("email")}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@partner.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partnerRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={(v) => v && field.onChange(v)}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PARTNER_ROLE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Admins manage their own colleagues. Agents book. Accountants see money
                        only.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tourOperatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("tourOperator")} / {t("travelAgent")}
                      </FormLabel>
                      <Select onValueChange={(v) => v && field.onChange(v)} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`${tc("select")}...`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(tourOperators ?? []).map((to) => (
                            <SelectItem key={to.id} value={to.id}>
                              {to.name} ({to.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>{tc("active")}</FormLabel>
                    </FormItem>
                  )}
                />

                <p className="text-muted-foreground text-xs">
                  No password is set here. Saving produces a one-time invitation link — the
                  partner chooses their own password and sets up two-factor on it.
                </p>

                {createMutation.error && (
                  <p className="text-destructive text-sm">{createMutation.error.message}</p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? tc("creating") : t("newPartnerUser")}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    {tc("cancel")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* ---- Invitation link ---- */}
        <Dialog open={!!invite} onOpenChange={(open) => !open && setInvite(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invitation link</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Send this to <strong>{invite?.email}</strong>. It works once and expires in{" "}
              {invite?.days} days. Any earlier link for this person has stopped working.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={invite?.url ?? ""} className="font-mono text-xs" />
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(invite?.url ?? "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Button variant="outline" onClick={() => setInvite(null)}>
              {tc("close")}
            </Button>
          </DialogContent>
        </Dialog>

        {/* ---- Reset password ---- */}
        <Dialog
          open={resetDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setResetDialog({ open: false, userId: "", userName: "" });
              resetForm.reset();
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("resetPassword")}</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Set a new password for <strong>{resetDialog.userName}</strong>. Their current
              sessions end immediately.
            </p>
            <Form {...resetForm}>
              <form
                onSubmit={resetForm.handleSubmit((v) =>
                  resetMutation.mutate({ id: resetDialog.userId, newPassword: v.newPassword }),
                )}
                className="space-y-4"
              >
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("newPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>{PARTNER_PASSWORD_HINT}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {resetMutation.error && (
                  <p className="text-destructive text-sm">{resetMutation.error.message}</p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={resetMutation.isPending}>
                    {resetMutation.isPending ? t("resetting") : t("resetPassword")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResetDialog({ open: false, userId: "", userName: "" });
                      resetForm.reset();
                    }}
                  >
                    {tc("cancel")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
