"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, UserCheck } from "lucide-react";
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
import { OPS_DESTINATION_CODES, OPS_GUIDE_TYPE_LABELS } from "@/lib/constants/tour-ops";
import type { OpsGuideType } from "@prisma/client";
import { PermissionGuard } from "@/components/shared/permission-guard";

type RateDialog = { open: boolean; id?: string; destinationCode: string; guideType: string; currency: string };
const emptyDialog = (): RateDialog => ({ open: false, destinationCode: "", guideType: "", currency: "EGP" });

export default function GuidanceMasterDataPage() {
  const utils = trpc.useUtils();
  const [filterDest, setFilterDest] = useState<string>("ALL");
  const { data: rates = [], isLoading } = trpc.tourOps.guidance.list.useQuery({
    destinationCode: filterDest === "ALL" ? undefined : filterDest,
  });

  const [dialog, setDialog] = useState<RateDialog>(emptyDialog());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const create = trpc.tourOps.guidance.create.useMutation({
    onSuccess: () => { utils.tourOps.guidance.list.invalidate(); setDialog(emptyDialog()); toast.success("Guidance rate created"); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.tourOps.guidance.update.useMutation({
    onSuccess: () => { utils.tourOps.guidance.list.invalidate(); setDialog(emptyDialog()); toast.success("Updated"); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.tourOps.guidance.delete.useMutation({
    onSuccess: () => { utils.tourOps.guidance.list.invalidate(); toast.success("Deleted"); },
  });

  function submitDialog() {
    if (!dialog.destinationCode || !dialog.guideType) return;
    if (dialog.id) {
      update.mutate({ id: dialog.id, data: { destinationCode: dialog.destinationCode, guideType: dialog.guideType as OpsGuideType, currency: dialog.currency } });
    } else {
      create.mutate({ destinationCode: dialog.destinationCode, guideType: dialog.guideType as OpsGuideType, currency: dialog.currency });
    }
  }

  const grouped = rates.reduce<Record<string, typeof rates>>((acc, r) => {
    (acc[r.destinationCode] ??= []).push(r);
    return acc;
  }, {});

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="size-6" /> Guidance Rates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage guide/escort daily rates with seasonal pricing.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterDest} onValueChange={setFilterDest}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Destinations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Destinations</SelectItem>
              {OPS_DESTINATION_CODES.map((d) => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setDialog({ ...emptyDialog(), open: true })}>
            <Plus className="size-4 mr-1" /> Add Rate
          </Button>
        </div>
      </div>

      {rates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No guidance rates yet.</CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([destCode, items]) => {
        const dest = OPS_DESTINATION_CODES.find((d) => d.code === destCode);
        return (
          <div key={destCode}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono">{destCode}</Badge>
              <span className="text-sm font-medium text-muted-foreground">{dest?.label ?? destCode}</span>
            </div>
            <div className="space-y-1">
              {items.map((rate) => {
                const activeSeason = rate.seasons.find((s) => s.isActive);
                return (
                  <PermissionGuard permission="tour-ops:component:read">
                    <div key={rate.id} className="flex items-center justify-between border rounded px-3 py-2 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{OPS_GUIDE_TYPE_LABELS[rate.guideType as OpsGuideType]}</span>
                      <Badge variant="secondary" className="text-xs">{rate.currency}</Badge>
                      <Badge variant="secondary" className="text-xs">{rate.seasons.length} season{rate.seasons.length !== 1 ? "s" : ""}</Badge>
                      {activeSeason && (
                        <Badge variant="default" className="text-xs">
                          {Number(activeSeason.pricePerDay).toLocaleString()} {rate.currency}/day
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/tour-ops/master-data/guidance/${rate.id}`}>Seasons</Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, id: rate.id, destinationCode: rate.destinationCode, guideType: rate.guideType, currency: rate.currency })}>
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
        );
      })}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog(emptyDialog())}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.id ? "Edit Guidance Rate" : "New Guidance Rate"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Destination</Label>
              <Select value={dialog.destinationCode} onValueChange={(v) => setDialog((p) => ({ ...p, destinationCode: v }))}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  {OPS_DESTINATION_CODES.map((d) => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Guide Type</Label>
              <Select value={dialog.guideType} onValueChange={(v) => setDialog((p) => ({ ...p, guideType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select guide type" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(OPS_GUIDE_TYPE_LABELS) as [OpsGuideType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
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
            <Button onClick={submitDialog} disabled={!dialog.destinationCode || !dialog.guideType}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guidance Rate?</AlertDialogTitle>
            <AlertDialogDescription>All rate seasons will also be deleted.</AlertDialogDescription>
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
