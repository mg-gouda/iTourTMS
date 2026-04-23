"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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

  const deleteMutation = trpc.crm.supplier.delete.useMutation({
    onSuccess: () => {
      utils.crm.supplier.list.invalidate();
      toast.success("Supplier deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage excursion suppliers (boats, restaurants, guides, etc.)</p>
        </div>
        <Button onClick={() => router.push("/crm/suppliers/new")}>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this supplier?")) {
                      deleteMutation.mutate({ id: row.original.id });
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              ),
            },
          ] as ColumnDef<SupplierRow>[]}
          data={(data ?? []) as SupplierRow[]}
          searchKey="name"
          searchPlaceholder="Search suppliers..."
          onRowClick={(row) => router.push(`/crm/suppliers/${row.id}`)}
        />
      )}
    </div>
  );
}
