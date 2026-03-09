"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
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
  Form,
  FormControl,
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
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Minimum 6 characters"),
  tourOperatorId: z.string().min(1, "Partner is required"),
  isActive: z.boolean().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Minimum 6 characters"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type PartnerUserRow = {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  tourOperator: { id: string; name: string; code: string } | null;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PartnerUsersPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.b2bPortal.partnerUser.list.useQuery();
  const { data: tourOperators } = trpc.b2bPortal.tourOperator.list.useQuery();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false,
    userId: "",
    userName: "",
  });

  // -- Create form --
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      tourOperatorId: "",
      isActive: true,
    },
  });

  const createMutation = trpc.b2bPortal.partnerUser.create.useMutation({
    onSuccess: () => {
      utils.b2bPortal.partnerUser.list.invalidate();
      closeDialog();
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    form.reset();
  }

  function onSubmit(values: CreateFormValues) {
    createMutation.mutate(values);
  }

  // -- Toggle active --
  const toggleMutation = trpc.b2bPortal.partnerUser.toggleActive.useMutation({
    onSuccess: () => {
      utils.b2bPortal.partnerUser.list.invalidate();
    },
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

  function onResetPassword(values: ResetPasswordFormValues) {
    resetMutation.mutate({ id: resetDialog.userId, newPassword: values.newPassword });
  }

  // -- Columns --
  const columns: ColumnDef<PartnerUserRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name ?? "—"}</span>,
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }) => {
          const to = row.original.tourOperator;
          if (!to) return "—";
          return (
            <span>
              {to.name}{" "}
              <span className="font-mono text-xs text-muted-foreground">({to.code})</span>
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.original.isActive}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ id: row.original.id, isActive: checked })
              }
              disabled={toggleMutation.isPending}
            />
            <Badge variant={row.original.isActive ? "default" : "secondary"}>
              {row.original.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        ),
      },
      {
        id: "created",
        header: "Created",
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
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setResetDialog({
                open: true,
                userId: row.original.id,
                userName: row.original.name ?? row.original.email,
              });
            }}
          >
            <KeyRound className="mr-1 size-3.5" />
            Reset Password
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggleMutation.isPending]
  );

  // -- Filtering --
  const filtered = useMemo(() => {
    let rows = (data ?? []) as PartnerUserRow[];
    if (statusFilter === "active") rows = rows.filter((r) => r.isActive);
    if (statusFilter === "inactive") rows = rows.filter((r) => !r.isActive);
    return rows;
  }, [data, statusFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partner Users</h1>
          <p className="text-muted-foreground">
            Manage login accounts for tour operator and travel agent partners
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 size-4" /> New Partner User
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
          searchPlaceholder="Search partner users..."
          toolbar={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      )}

      {/* ---- Create Partner User Dialog ---- */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
          else setDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Partner User</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@partner.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min. 6 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tourOperatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tour Operator / Travel Agent</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select partner..." />
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
                    <FormLabel>Active</FormLabel>
                  </FormItem>
                )}
              />

              {createMutation.error && (
                <p className="text-sm text-destructive">{createMutation.error.message}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Partner User"}
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ---- Reset Password Dialog ---- */}
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
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set a new password for <strong>{resetDialog.userName}</strong>.
          </p>
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min. 6 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {resetMutation.error && (
                <p className="text-sm text-destructive">{resetMutation.error.message}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={resetMutation.isPending}>
                  {resetMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetDialog({ open: false, userId: "", userName: "" });
                    resetForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
