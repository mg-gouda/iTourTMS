"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { trpc } from "@/lib/trpc";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  countryId: z.string().optional(),
  marketId: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTermDays: z.number().int().min(0).optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

type FormValues = z.infer<typeof createSchema>;

type TourOperatorRow = {
  id: string;
  name: string;
  code: string;
  country: { name: string } | null;
  market: { name: string } | null;
  _count: { contractAssignments: number; hotelAssignments: number; bookings: number };
  creditLimit: unknown;
  active: boolean;
};

const columns: ColumnDef<TourOperatorRow>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "country",
    header: "Country",
    cell: ({ row }) => row.original.country?.name ?? "—",
  },
  {
    id: "market",
    header: "Market",
    cell: ({ row }) => row.original.market?.name ?? "—",
  },
  {
    id: "contracts",
    header: "Contracts",
    cell: ({ row }) => row.original._count.contractAssignments,
  },
  {
    id: "hotels",
    header: "Hotels",
    cell: ({ row }) => row.original._count.hotelAssignments,
  },
  {
    id: "creditLimit",
    header: "Credit Limit",
    cell: ({ row }) => {
      const val = Number(row.original.creditLimit ?? 0);
      return val > 0 ? `$${val.toLocaleString()}` : "—";
    },
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

export default function TourOperatorsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.b2bPortal.tourOperator.list.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      code: "",
      contactPerson: "",
      email: "",
      phone: "",
      countryId: "",
      marketId: "",
      creditLimit: 0,
      paymentTermDays: 30,
      commissionPct: 0,
      active: true,
    },
  });

  const createMutation = trpc.b2bPortal.tourOperator.create.useMutation({
    onSuccess: () => {
      utils.b2bPortal.tourOperator.list.invalidate();
      closeDialog();
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    form.reset();
  }

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  const filtered = useMemo(() => {
    let rows = (data ?? []) as TourOperatorRow[];
    if (statusFilter === "active") rows = rows.filter((r) => r.active);
    if (statusFilter === "inactive") rows = rows.filter((r) => !r.active);
    return rows;
  }, [data, statusFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tour Operators</h1>
          <p className="text-muted-foreground">Manage tour operator partners and accounts</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 size-4" /> New Tour Operator
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="name"
          searchPlaceholder="Search tour operators..."
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
          onRowClick={(row) => router.push(`/b2b-portal/tour-operators/${row.id}`)}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Tour Operator</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="e.g. TUI, FTI" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="countryId" render={({ field }) => (
                  <FormItem><FormLabel>Country ID</FormLabel><FormControl><Input placeholder="Country ID" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="marketId" render={({ field }) => (
                  <FormItem><FormLabel>Market ID</FormLabel><FormControl><Input placeholder="Market ID" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="creditLimit" render={({ field }) => (
                  <FormItem><FormLabel>Credit Limit</FormLabel><FormControl><Input type="number" value={String(field.value ?? 0)} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="paymentTermDays" render={({ field }) => (
                  <FormItem><FormLabel>Payment Terms (days)</FormLabel><FormControl><Input type="number" value={String(field.value ?? 30)} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="commissionPct" render={({ field }) => (
                  <FormItem><FormLabel>Commission %</FormLabel><FormControl><Input type="number" step="0.1" value={String(field.value ?? 0)} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel>Active</FormLabel>
                </FormItem>
              )} />

              {createMutation.error && (
                <p className="text-sm text-destructive">{createMutation.error.message}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Tour Operator"}
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
