"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OPS_DESTINATION_CODES, OPS_GUIDE_TYPE_LABELS } from "@/lib/constants/tour-ops";
import type { OpsGuideType } from "@prisma/client";

type SeasonDialog = { open: boolean; id?: string; name: string; dateFrom: string; dateTo: string; isActive: boolean; pricePerDay: number };
const emptyDialog = (): SeasonDialog => ({ open: false, name: "", dateFrom: "", dateTo: "", isActive: true, pricePerDay: 0 });

export default function GuidanceRateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: rate, isLoading } = trpc.tourOps.guidance.getById.useQuery({ id });
  const [dialog, setDialog] = useState<SeasonDialog>(emptyDialog());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const addSeason = trpc.tourOps.guidance.addSeason.useMutation({
    onSuccess: () => { utils.tourOps.guidance.getById.invalidate({ id }); setDialog(emptyDialog()); toast.success("Season added"); },
    onError: (e) => toast.error(e.message),
  });
  const updateSeason = trpc.tourOps.guidance.updateSeason.useMutation({
    onSuccess: () => { utils.tourOps.guidance.getById.invalidate({ id }); setDialog(emptyDialog()); toast.success("Season updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSeason = trpc.tourOps.guidance.deleteSeason.useMutation({
    onSuccess: () => { utils.tourOps.guidance.getById.invalidate({ id }); toast.success("Season deleted"); },
  });

  function submitSeason() {
    const { id: sid, open: _o, ...data } = dialog;
    if (sid) updateSeason.mutate({ id: sid, data });
    else addSeason.mutate({ guidanceId: id, ...data });
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!rate) return <div className="p-6 text-destructive">Rate not found.</div>;

  const dest = OPS_DESTINATION_CODES.find((d) => d.code === rate.destinationCode);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{rate.destinationCode}</Badge>
            <span className="text-xs text-muted-foreground">{dest?.label}</span>
            <h1 className="text-xl font-bold">{OPS_GUIDE_TYPE_LABELS[rate.guideType as OpsGuideType]}</h1>
            <Badge variant="secondary">{rate.currency}/day</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Rate Seasons</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setDialog({ ...emptyDialog(), open: true })}>
          <Plus className="size-4 mr-1" /> Add Season
        </Button>
      </div>

      {rate.seasons.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No seasons yet.</CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {rate.seasons.map((season) => (
          <div key={season.id} className="flex items-center justify-between border rounded px-4 py-3">
            <div className="flex items-center gap-3">
              {season.isActive ? <CheckCircle2 className="size-4 text-green-500" /> : <XCircle className="size-4 text-muted-foreground" />}
              <span className="font-medium">{season.name}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(season.dateFrom), "dd MMM yyyy")} – {format(new Date(season.dateTo), "dd MMM yyyy")}
              </span>
              <Badge variant={season.isActive ? "default" : "secondary"} className="text-sm font-semibold">
                {Number(season.pricePerDay).toLocaleString()} {rate.currency}/day
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setDialog({
                open: true, id: season.id, name: season.name,
                dateFrom: season.dateFrom.toString().slice(0, 10),
                dateTo: season.dateTo.toString().slice(0, 10),
                isActive: season.isActive, pricePerDay: Number(season.pricePerDay),
              })}>
                <Pencil className="size-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(season.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog(emptyDialog())}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.id ? "Edit Season" : "New Season"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Season Name</Label>
              <Input placeholder="e.g. Winter 2025-26" value={dialog.name} onChange={(e) => setDialog((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input type="date" value={dialog.dateFrom} onChange={(e) => setDialog((p) => ({ ...p, dateFrom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input type="date" value={dialog.dateTo} onChange={(e) => setDialog((p) => ({ ...p, dateTo: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Price Per Day ({rate.currency})</Label>
              <Input type="number" min={0} value={dialog.pricePerDay} onChange={(e) => setDialog((p) => ({ ...p, pricePerDay: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={dialog.isActive} onCheckedChange={(v) => setDialog((p) => ({ ...p, isActive: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(emptyDialog())}>Cancel</Button>
            <Button onClick={submitSeason} disabled={!dialog.name || !dialog.dateFrom || !dialog.dateTo}>Save Season</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season?</AlertDialogTitle>
            <AlertDialogDescription>This season will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteSeason.mutate({ id: deleteId }); setDeleteId(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
