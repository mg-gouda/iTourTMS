"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { PermissionGuard } from "@/components/shared/permission-guard";

type Override = {
  id: string;
  price: unknown;
  isActive: boolean;
  partner: { id: string; name: string };
  priceItem: {
    id: string;
    vehicleType: { name: string };
    fromZone: { name: string } | null;
    toZone: { name: string } | null;
    currency: { symbol: string };
  };
};

export default function PartnerOverridesPage() {
  const utils = trpc.useUtils();
  const t = useTranslations("traffic");
  const tc = useTranslations("common");
  const { data, isLoading } = trpc.traffic.partnerPriceOverride.list.useQuery();
  const { data: partners } = trpc.b2bPortal.tourOperator.list.useQuery();
  const { data: priceItems } = trpc.traffic.priceItem.list.useQuery();

  const createMutation = trpc.traffic.partnerPriceOverride.create.useMutation({
    onSuccess: () => {
      toast.success("Override added");
      utils.traffic.partnerPriceOverride.list.invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.traffic.partnerPriceOverride.delete.useMutation({
    onSuccess: () => {
      toast.success("Override deleted");
      utils.traffic.partnerPriceOverride.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [priceItemId, setPriceItemId] = useState("");
  const [price, setPrice] = useState("");

  function handleCreate() {
    if (!partnerId || !priceItemId || !price) {
      toast.error("Please fill all required fields");
      return;
    }
    createMutation.mutate({
      partnerId,
      priceItemId,
      price: Number(price),
      isActive: true,
    });
  }

  const columns: ColumnDef<Override>[] = [
    { id: "partner", header: t("partnerPriceOverrides").split(" ")[0], accessorFn: (r) => r.partner.name },
    { id: "vehicleType", header: t("vehicleType"), accessorFn: (r) => r.priceItem.vehicleType.name },
    { id: "fromZone", header: t("fromZone"), accessorFn: (r) => r.priceItem.fromZone?.name ?? tc("all") },
    { id: "toZone", header: t("toZone"), accessorFn: (r) => r.priceItem.toZone?.name ?? tc("all") },
    { id: "price", header: t("overridePrice"), accessorFn: (r) => `${r.priceItem.currency.symbol}${Number(r.price).toFixed(2)}` },
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

    <PermissionGuard permission="traffic:pricing:read">
      <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold">{t("partnerPriceOverrides")}</h1>
          <p className="text-muted-foreground">{t("partnerOverridesDesc")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {t("addOverride")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addPartnerOverride")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("partnerPriceOverrides").split(" ")[0]}</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger><SelectValue placeholder={tc("select") + "..."} /></SelectTrigger>
                  <SelectContent>
                    {(partners ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("priceItem")}</Label>
                <Select value={priceItemId} onValueChange={setPriceItemId}>
                  <SelectTrigger><SelectValue placeholder={tc("select") + "..."} /></SelectTrigger>
                  <SelectContent>
                    {(priceItems ?? []).map((pi) => (
                      <SelectItem key={pi.id} value={pi.id}>
                        {pi.vehicleType?.name ?? "—"} — {pi.fromZone?.name ?? "Any"} → {pi.toZone?.name ?? "Any"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("overridePrice")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? tc("saving") : t("addOverride")}
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
        <DataTable columns={columns} data={(data ?? []) as Override[]} />
      )}
    </div>
  

    </PermissionGuard>

  );
}
