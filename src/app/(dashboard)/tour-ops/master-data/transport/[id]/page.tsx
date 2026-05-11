"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OPS_VEHICLE_TYPE_LABELS, OPS_VEHICLE_TYPE_CAPACITY } from "@/lib/constants/tour-ops";
import type { OpsVehicleType } from "@prisma/client";
import { format } from "date-fns";

const VEHICLE_TYPES: OpsVehicleType[] = ["SEDAN", "VAN_11", "VAN_16", "BUS_25", "BUS_45"];

type RateInput = { vehicleType: OpsVehicleType; rentEGP: number; tipEGP: number; repAllowEGP: number };

const emptyRates = (): RateInput[] =>
  VEHICLE_TYPES.map((v) => ({ vehicleType: v, rentEGP: 0, tipEGP: 0, repAllowEGP: 0 }));

type SeasonDialogState = {
  open: boolean;
  id?: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  isActive: boolean;
  rates: RateInput[];
};

const emptySeasonDialog = (): SeasonDialogState => ({
  open: false,
  name: "",
  dateFrom: "",
  dateTo: "",
  isActive: true,
  rates: emptyRates(),
});

export default function TransportRouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: route, isLoading } = trpc.tourOps.transport.getRoute.useQuery({ id });
  const [seasonDialog, setSeasonDialog] = useState<SeasonDialogState>(emptySeasonDialog());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const addSeason = trpc.tourOps.transport.addSeason.useMutation({
    onSuccess: () => {
      utils.tourOps.transport.getRoute.invalidate({ id });
      setSeasonDialog(emptySeasonDialog());
      toast.success("Season added");
    },
    onError: (e) => toast.error(e.message),
  });
  const updateSeason = trpc.tourOps.transport.updateSeason.useMutation({
    onSuccess: () => {
      utils.tourOps.transport.getRoute.invalidate({ id });
      setSeasonDialog(emptySeasonDialog());
      toast.success("Season updated");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteSeason = trpc.tourOps.transport.deleteSeason.useMutation({
    onSuccess: () => {
      utils.tourOps.transport.getRoute.invalidate({ id });
      toast.success("Season deleted");
    },
  });

  function openEdit(season: NonNullable<typeof route>["seasons"][number]) {
    setSeasonDialog({
      open: true,
      id: season.id,
      name: season.name,
      dateFrom: season.dateFrom.toString().slice(0, 10),
      dateTo: season.dateTo.toString().slice(0, 10),
      isActive: season.isActive,
      rates: VEHICLE_TYPES.map((v) => {
        const existing = season.rates.find((r) => r.vehicleType === v);
        return {
          vehicleType: v,
          rentEGP: existing ? Number(existing.rentEGP) : 0,
          tipEGP: existing ? Number(existing.tipEGP) : 0,
          repAllowEGP: existing ? Number(existing.repAllowEGP) : 0,
        };
      }),
    });
  }

  function setRate(vehicleType: OpsVehicleType, field: keyof RateInput, value: number) {
    setSeasonDialog((prev) => ({
      ...prev,
      rates: prev.rates.map((r) => r.vehicleType === vehicleType ? { ...r, [field]: value } : r),
    }));
  }

  function submitSeason() {
    const { id: sid, open: _o, ...data } = seasonDialog;
    if (sid) {
      updateSeason.mutate({ id: sid, data });
    } else {
      addSeason.mutate({ routeId: id, ...data });
    }
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!route) return <div className="p-6 text-destructive">Route not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{route.destination.code}</Badge>
            <h1 className="text-xl font-bold">{route.nameEn}</h1>
            {route.nameAr && <span className="text-sm text-muted-foreground" dir="rtl">{route.nameAr}</span>}
          </div>
          <p className="text-sm text-muted-foreground">Rate Seasons</p>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setSeasonDialog({ ...emptySeasonDialog(), open: true })}>
            <Plus className="size-4 mr-1" /> Add Season
          </Button>
        </div>
      </div>

      {route.seasons.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No rate seasons yet. Add a season to define vehicle prices for this route.
          </CardContent>
        </Card>
      )}

      {route.seasons.map((season) => (
        <Card key={season.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {season.isActive
                  ? <CheckCircle2 className="size-4 text-green-500" />
                  : <XCircle className="size-4 text-muted-foreground" />
                }
                <CardTitle className="text-base">{season.name}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(season.dateFrom), "dd MMM yyyy")} – {format(new Date(season.dateTo), "dd MMM yyyy")}
                </span>
                {!season.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(season)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(season.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Rent (EGP)</TableHead>
                  <TableHead className="text-right">Tip (EGP)</TableHead>
                  <TableHead className="text-right">Rep Allow (EGP)</TableHead>
                  <TableHead className="text-right">Total (EGP)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {VEHICLE_TYPES.map((vt) => {
                  const rate = season.rates.find((r) => r.vehicleType === vt);
                  if (!rate) return null;
                  const total = Number(rate.rentEGP) + Number(rate.tipEGP) + Number(rate.repAllowEGP);
                  return (
                    <TableRow key={vt}>
                      <TableCell className="font-medium">{OPS_VEHICLE_TYPE_LABELS[vt]}</TableCell>
                      <TableCell className="text-muted-foreground">{OPS_VEHICLE_TYPE_CAPACITY[vt]} pax</TableCell>
                      <TableCell className="text-right">{Number(rate.rentEGP).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(rate.tipEGP).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(rate.repAllowEGP).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{total.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Season dialog */}
      <Dialog open={seasonDialog.open} onOpenChange={(o) => !o && setSeasonDialog(emptySeasonDialog())}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{seasonDialog.id ? "Edit Season" : "New Season"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Season Name</Label>
                <Input placeholder="e.g. Winter 2025-26" value={seasonDialog.name} onChange={(e) => setSeasonDialog((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input type="date" value={seasonDialog.dateFrom} onChange={(e) => setSeasonDialog((p) => ({ ...p, dateFrom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input type="date" value={seasonDialog.dateTo} onChange={(e) => setSeasonDialog((p) => ({ ...p, dateTo: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={seasonDialog.isActive} onCheckedChange={(v) => setSeasonDialog((p) => ({ ...p, isActive: v }))} />
                <Label>Active</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Vehicle Rates (EGP)</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Rep Allow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasonDialog.rates.map((r) => (
                    <TableRow key={r.vehicleType}>
                      <TableCell className="font-medium py-1">{OPS_VEHICLE_TYPE_LABELS[r.vehicleType]}</TableCell>
                      <TableCell className="py-1">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-28"
                          value={r.rentEGP}
                          onChange={(e) => setRate(r.vehicleType, "rentEGP", parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-28"
                          value={r.tipEGP}
                          onChange={(e) => setRate(r.vehicleType, "tipEGP", parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-28"
                          value={r.repAllowEGP}
                          onChange={(e) => setRate(r.vehicleType, "repAllowEGP", parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeasonDialog(emptySeasonDialog())}>Cancel</Button>
            <Button
              onClick={submitSeason}
              disabled={!seasonDialog.name || !seasonDialog.dateFrom || !seasonDialog.dateTo}
            >
              Save Season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete season */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the season and all its vehicle rates permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) deleteSeason.mutate({ id: deleteTarget }); setDeleteTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
