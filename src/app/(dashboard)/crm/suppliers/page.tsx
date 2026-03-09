"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

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
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { supplierCreateSchema } from "@/lib/validations/crm";

type SupplierRow = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  type: string | null;
  active: boolean;
  _count: { costComponents: number };
};

type FormValues = z.input<typeof supplierCreateSchema>;

const columns: ColumnDef<SupplierRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "contactName",
    header: "Contact",
    cell: ({ row }) => row.original.contactName ?? "—",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email ?? "—",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone ?? "—",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => row.original.type ?? "—",
  },
  {
    id: "costComponents",
    header: "Components",
    cell: ({ row }) => row.original._count.costComponents,
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.active ? "default" : "secondary"}>
        {row.original.active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export default function SuppliersPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.crm.supplier.list.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(supplierCreateSchema),
    defaultValues: { name: "", contactName: "", email: "", phone: "", type: "", notes: "", active: true },
  });

  const createMutation = trpc.crm.supplier.create.useMutation({
    onSuccess: () => {
      utils.crm.supplier.list.invalidate();
      closeDialog();
    },
  });

  const updateMutation = trpc.crm.supplier.update.useMutation({
    onSuccess: () => {
      utils.crm.supplier.list.invalidate();
      closeDialog();
    },
  });

  const deleteMutation = trpc.crm.supplier.delete.useMutation({
    onSuccess: () => utils.crm.supplier.list.invalidate(),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    form.reset({ name: "", contactName: "", email: "", phone: "", type: "", notes: "", active: true });
  }

  function openCreate() {
    form.reset({ name: "", contactName: "", email: "", phone: "", type: "", notes: "", active: true });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(supplier: SupplierRow) {
    form.reset({
      name: supplier.name,
      contactName: supplier.contactName ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      type: supplier.type ?? "",
      notes: "",
      active: supplier.active,
    });
    setEditingId(supplier.id);
    setDialogOpen(true);
  }

  function onSubmit(values: FormValues) {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage excursion suppliers (boats, restaurants, guides, etc.)</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> New Supplier
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
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={[
            ...columns,
            {
              id: "actions",
              cell: ({ row }) => (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this supplier?")) deleteMutation.mutate({ id: row.original.id });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ),
            },
          ] as ColumnDef<SupplierRow>[]}
          data={(data ?? []) as SupplierRow[]}
          searchKey="name"
          searchPlaceholder="Search suppliers..."
          onRowClick={(row) => router.push(`/crm/suppliers/${row.id}`)}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Supplier" : "New Supplier"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contactName" render={({ field }) => (
                <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="e.g. boat, restaurant, guide" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel>Active</FormLabel>
                </FormItem>
              )} />

              {(createMutation.error || updateMutation.error) && (
                <p className="text-sm text-destructive">
                  {(createMutation.error || updateMutation.error)?.message}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : editingId ? "Save Changes" : "Create Supplier"}
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
