"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/data-table";
import { trpc } from "@/lib/trpc";

type SupplierPrice = {
  id: string;
  routeDesc: string | null;
  price: unknown;
  isActive: boolean;
  supplier: { id: string; name: string };
  vehicleType: { id: string; name: string };
  currency: { id: string; code: string; symbol: string };
};

export default function SupplierPricesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.traffic.supplierTripPrice.list.useQuery();
  const { data: suppliers } = trpc.crm.supplier.list.useQuery();
  const { data: vehicleTypes } = trpc.traffic.vehicleType.list.useQuery();

  const createMutation = trpc.traffic.supplierTripPrice.create.useMutation({
    onSuccess: () => {
      toast.success("Supplier price added");
      utils.traffic.supplierTripPrice.list.invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.traffic.supplierTripPrice.delete.useMutation({
    onSuccess: () => {
      toast.success("Price deleted");
      utils.traffic.supplierTripPrice.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [routeDesc, setRouteDesc] = useState("");
  const [price, setPrice] = useState("");
  const [currencyId, setCurrencyId] = useState("");

  function handleCreate() {
    if (!supplierId || !vehicleTypeId || !price || !currencyId) {
      toast.error("Please fill all required fields");
      return;
    }
    createMutation.mutate({
      supplierId,
      vehicleTypeId,
      routeDesc: routeDesc || null,
      price: Number(price),
      currencyId,
      isActive: true,
    });
  }

  const columns: ColumnDef<SupplierPrice>[] = [
    { id: "supplier", header: "Supplier", accessorFn: (r) => r.supplier.name },
    { id: "vehicleType", header: "Vehicle Type", accessorFn: (r) => r.vehicleType.name },
    { accessorKey: "routeDesc", header: "Route", cell: ({ row }) => row.original.routeDesc ?? "—" },
    { id: "price", header: "Price", accessorFn: (r) => `${r.currency.symbol}${Number(r.price).toFixed(2)}` },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteMutation.mutate({ id: row.original.id })}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold">Supplier Trip Prices</h1>
          <p className="text-muted-foreground">Cost rates from transport suppliers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Price
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Supplier Price</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                  <SelectContent>
                    {(suppliers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vehicle Type</Label>
                <Select value={vehicleTypeId} onValueChange={setVehicleTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle type..." /></SelectTrigger>
                  <SelectContent>
                    {(vehicleTypes ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Route Description</Label>
                <Input
                  value={routeDesc}
                  onChange={(e) => setRouteDesc(e.target.value)}
                  placeholder="e.g. Airport to Downtown"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={currencyId}
                    onChange={(e) => setCurrencyId(e.target.value)}
                    placeholder="Currency ID"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? "Adding..." : "Add Price"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={(data ?? []) as SupplierPrice[]} />
      )}
    </div>
  );
}
