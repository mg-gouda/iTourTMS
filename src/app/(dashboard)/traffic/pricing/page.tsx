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
import { TT_PRICE_TYPE_LABELS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

type PriceItem = {
  id: string;
  priceType: string;
  price: unknown;
  serviceType: string | null;
  description: string | null;
  isActive: boolean;
  vehicleType: { id: string; name: string };
  fromZone: { name: string } | null;
  toZone: { name: string } | null;
  currency: { id: string; code: string; symbol: string };
};

export default function PricingPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.traffic.priceItem.list.useQuery();
  const { data: vehicleTypes } = trpc.traffic.vehicleType.list.useQuery();
  const { data: zones } = trpc.traffic.zone.list.useQuery();
  const { data: currencies } = trpc.finance.currency.list.useQuery();

  const createMutation = trpc.traffic.priceItem.create.useMutation({
    onSuccess: () => {
      toast.success("Price item created");
      utils.traffic.priceItem.list.invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.traffic.priceItem.delete.useMutation({
    onSuccess: () => {
      toast.success("Price item deleted");
      utils.traffic.priceItem.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [priceType, setPriceType] = useState("PER_VEHICLE");
  const [serviceType, setServiceType] = useState("");
  const [fromZoneId, setFromZoneId] = useState("");
  const [toZoneId, setToZoneId] = useState("");
  const [price, setPrice] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [description, setDescription] = useState("");

  const columns: ColumnDef<PriceItem>[] = [
    { id: "vehicleType", header: "Vehicle Type", accessorFn: (r) => r.vehicleType.name },
    { id: "service", header: "Service", accessorFn: (r) => r.serviceType ? TT_SERVICE_TYPE_LABELS[r.serviceType] ?? r.serviceType : "Any" },
    { id: "priceType", header: "Price Type", accessorFn: (r) => TT_PRICE_TYPE_LABELS[r.priceType] ?? r.priceType },
    { id: "fromZone", header: "From Zone", accessorFn: (r) => r.fromZone?.name ?? "Any" },
    { id: "toZone", header: "To Zone", accessorFn: (r) => r.toZone?.name ?? "Any" },
    { id: "price", header: "Price", accessorFn: (r) => `${r.currency.symbol}${Number(r.price).toFixed(2)}` },
    { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description ?? "—" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate({ id: row.original.id })}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold">Price Items</h1>
          <p className="text-muted-foreground">Base pricing grid for transport services</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Price Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Price Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Vehicle Type *</Label>
                <Select value={vehicleTypeId} onValueChange={setVehicleTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {(vehicleTypes ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price Type</Label>
                  <Select value={priceType} onValueChange={setPriceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TT_PRICE_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Service Type</Label>
                  <Select value={serviceType || "__any"} onValueChange={(v) => setServiceType(v === "__any" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any">Any</SelectItem>
                      {Object.entries(TT_SERVICE_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>From Zone</Label>
                  <Select value={fromZoneId || "__any"} onValueChange={(v) => setFromZoneId(v === "__any" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any">Any</SelectItem>
                      {(zones ?? []).map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>To Zone</Label>
                  <Select value={toZoneId || "__any"} onValueChange={(v) => setToZoneId(v === "__any" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any">Any</SelectItem>
                      {(zones ?? []).map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price *</Label>
                  <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Currency *</Label>
                  <Select value={currencyId} onValueChange={setCurrencyId}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {(currencies ?? []).map((c: { id: string; code: string }) => (
                        <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <Button
                className="w-full"
                disabled={!vehicleTypeId || !price || !currencyId || createMutation.isPending}
                onClick={() => {
                  createMutation.mutate({
                    vehicleTypeId,
                    priceType,
                    serviceType: serviceType || null,
                    fromZoneId: fromZoneId || null,
                    toZoneId: toZoneId || null,
                    price: Number(price),
                    currencyId,
                    description: description || null,
                    isActive: true,
                  });
                }}
              >
                {createMutation.isPending ? "Creating..." : "Create Price Item"}
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
        <DataTable columns={columns} data={(data ?? []) as PriceItem[]} />
      )}
    </div>
  );
}
