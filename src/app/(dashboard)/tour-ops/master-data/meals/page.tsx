"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { OPS_DESTINATION_CODES, OPS_MEAL_TYPE_LABELS } from "@/lib/constants/tour-ops";
import type { OpsMealType } from "@prisma/client";
import { PermissionGuard } from "@/components/shared/permission-guard";

type RateDialog = { open: boolean; id?: string; nameEn: string; supplierId: string; destinationCode: string; mealType: string; currency: string };
const emptyDialog = (): RateDialog => ({ open: false, nameEn: "", supplierId: "", destinationCode: "", mealType: "", currency: "EGP" });

export default function MealsMasterDataPage() {
  const utils = trpc.useUtils();
  const [filterType, setFilterType] = useState<string>("ALL");
  const { data: rates = [], isLoading } = trpc.tourOps.meals.list.useQuery({
    mealType: filterType === "ALL" ? undefined : filterType,
  });
  const { data: suppliers = [] } = trpc.tourOps.lookup.suppliers.useQuery({ type: "restaurant" });

  const [dialog, setDialog] = useState<RateDialog>(emptyDialog());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const create = trpc.tourOps.meals.create.useMutation({
    onSuccess: () => { utils.tourOps.meals.list.invalidate(); setDialog(emptyDialog()); toast.success("Meal rate created"); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.tourOps.meals.update.useMutation({
    onSuccess: () => { utils.tourOps.meals.list.invalidate(); setDialog(emptyDialog()); toast.success("Updated"); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.tourOps.meals.delete.useMutation({
    onSuccess: () => { utils.tourOps.meals.list.invalidate(); toast.success("Deleted"); },
  });

  function submitDialog() {
    if (!dialog.nameEn || !dialog.mealType) return;
    const payload = {
      nameEn: dialog.nameEn,
      supplierId: dialog.supplierId || undefined,
      destinationCode: dialog.destinationCode || undefined,
      mealType: dialog.mealType as OpsMealType,
      currency: dialog.currency,
    };
    if (dialog.id) {
      update.mutate({ id: dialog.id, data: payload });
    } else {
      create.mutate(payload);
    }
  }

  const grouped = rates.reduce<Record<string, typeof rates>>((acc, r) => {
    (acc[r.mealType] ??= []).push(r);
    return acc;
  }, {});

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="size-6" /> Meal Rates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage restaurant/meal rates by type with seasonal pricing.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {(Object.entries(OPS_MEAL_TYPE_LABELS) as [OpsMealType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setDialog({ ...emptyDialog(), open: true })}>
            <Plus className="size-4 mr-1" /> Add Rate
          </Button>
        </div>
      </div>

      {rates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No meal rates yet.</CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([mealType, items]) => (
        <div key={mealType}>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{OPS_MEAL_TYPE_LABELS[mealType as OpsMealType]}</Badge>
          </div>
          <div className="space-y-1">
            {items.map((rate) => {
              const activeSeason = rate.seasons.find((s) => s.isActive);
              return (
                <PermissionGuard permission="tour-ops:component:read">
                  <div key={rate.id} className="flex items-center justify-between border rounded px-3 py-2 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{rate.nameEn}</span>
                    {rate.supplier && <span className="text-xs text-muted-foreground">{rate.supplier.name}</span>}
                    {rate.destinationCode && <Badge variant="secondary" className="text-xs font-mono">{rate.destinationCode}</Badge>}
                    <Badge variant="secondary" className="text-xs">{rate.seasons.length} season{rate.seasons.length !== 1 ? "s" : ""}</Badge>
                    {activeSeason && (
                      <Badge variant="default" className="text-xs">
                        {Number(activeSeason.pricePerPax).toLocaleString()} {rate.currency}/pax
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/tour-ops/master-data/meals/${rate.id}`}>Seasons</Link>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDialog({
                      open: true, id: rate.id, nameEn: rate.nameEn,
                      supplierId: rate.supplierId ?? "",
                      destinationCode: rate.destinationCode ?? "",
                      mealType: rate.mealType,
                      currency: rate.currency,
                    })}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(rate.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                </PermissionGuard>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog(emptyDialog())}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.id ? "Edit Meal Rate" : "New Meal Rate"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Buffet Lunch at Felfela" value={dialog.nameEn} onChange={(e) => setDialog((p) => ({ ...p, nameEn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Meal Type</Label>
              <Select value={dialog.mealType} onValueChange={(v) => setDialog((p) => ({ ...p, mealType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(OPS_MEAL_TYPE_LABELS) as [OpsMealType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier / Restaurant <span className="text-muted-foreground">(optional)</span></Label>
              <Select value={dialog.supplierId || "NONE"} onValueChange={(v) => setDialog((p) => ({ ...p, supplierId: v === "NONE" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— No supplier —</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destination <span className="text-muted-foreground">(optional)</span></Label>
              <Select value={dialog.destinationCode || "NONE"} onValueChange={(v) => setDialog((p) => ({ ...p, destinationCode: v === "NONE" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="All destinations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— All destinations —</SelectItem>
                  {OPS_DESTINATION_CODES.map((d) => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={dialog.currency} onChange={(e) => setDialog((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} maxLength={3} className="w-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(emptyDialog())}>Cancel</Button>
            <Button onClick={submitDialog} disabled={!dialog.nameEn || !dialog.mealType}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal Rate?</AlertDialogTitle>
            <AlertDialogDescription>All seasons will also be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) del.mutate({ id: deleteId }); setDeleteId(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
