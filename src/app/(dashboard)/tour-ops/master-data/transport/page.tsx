"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Bus, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OPS_DESTINATION_CODES } from "@/lib/constants/tour-ops";
import { exportTransportRatesExcel } from "@/lib/export/tour-ops-transport-excel";

export default function TransportMasterDataPage() {
  const utils = trpc.useUtils();
  const { data: destinations = [], isLoading } = trpc.tourOps.transport.listDestinations.useQuery();
  const importRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [destDialog, setDestDialog] = useState<{ open: boolean; id?: string; code: string; nameEn: string; nameAr: string }>({
    open: false, code: "", nameEn: "", nameAr: "",
  });
  const [routeDialog, setRouteDialog] = useState<{ open: boolean; destinationId: string; id?: string; nameEn: string; nameAr: string }>({
    open: false, destinationId: "", nameEn: "", nameAr: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "dest" | "route"; id: string } | null>(null);

  const createDest = trpc.tourOps.transport.createDestination.useMutation({
    onSuccess: () => { utils.tourOps.transport.listDestinations.invalidate(); setDestDialog({ open: false, code: "", nameEn: "", nameAr: "" }); toast.success("Destination created"); },
  });
  const updateDest = trpc.tourOps.transport.updateDestination.useMutation({
    onSuccess: () => { utils.tourOps.transport.listDestinations.invalidate(); setDestDialog({ open: false, code: "", nameEn: "", nameAr: "" }); toast.success("Destination updated"); },
  });
  const deleteDest = trpc.tourOps.transport.deleteDestination.useMutation({
    onSuccess: () => { utils.tourOps.transport.listDestinations.invalidate(); toast.success("Destination deleted"); },
  });
  const createRoute = trpc.tourOps.transport.createRoute.useMutation({
    onSuccess: () => { utils.tourOps.transport.listDestinations.invalidate(); setRouteDialog({ open: false, destinationId: "", nameEn: "", nameAr: "" }); toast.success("Route created"); },
  });
  const updateRoute = trpc.tourOps.transport.updateRoute.useMutation({
    onSuccess: () => { utils.tourOps.transport.listDestinations.invalidate(); setRouteDialog({ open: false, destinationId: "", nameEn: "", nameAr: "" }); toast.success("Route updated"); },
  });
  const deleteRoute = trpc.tourOps.transport.deleteRoute.useMutation({
    onSuccess: () => { utils.tourOps.transport.listDestinations.invalidate(); toast.success("Route deleted"); },
  });
  const bulkImport = trpc.tourOps.transport.bulkImport.useMutation({
    onSuccess: (res) => {
      utils.tourOps.transport.listDestinations.invalidate();
      toast.success(`Import complete — ${res.created} created, ${res.updated} updated`);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        const VEHICLE_COLS = [
          { key: "SEDAN",  rentCol: "Sedan Rent",      tipCol: "Sedan Tip",      repCol: "Sedan Rep Allow" },
          { key: "VAN_11", rentCol: "Van (1×11) Rent", tipCol: "Van (1×11) Tip", repCol: "Van (1×11) Rep Allow" },
          { key: "VAN_16", rentCol: "Van (1×16) Rent", tipCol: "Van (1×16) Tip", repCol: "Van (1×16) Rep Allow" },
          { key: "BUS_25", rentCol: "Bus (1×25) Rent", tipCol: "Bus (1×25) Tip", repCol: "Bus (1×25) Rep Allow" },
          { key: "BUS_45", rentCol: "Coach (1×45) Rent", tipCol: "Coach (1×45) Tip", repCol: "Coach (1×45) Rep Allow" },
        ] as const;
        const parsed = rows.map((r) => ({
          destinationCode: String(r["Destination Code"] ?? "").trim(),
          destinationName: String(r["Destination Name"] ?? "").trim(),
          routeNameEn: String(r["Route (EN)"] ?? "").trim(),
          routeNameAr: String(r["Route (AR)"] ?? "").trim() || undefined,
          seasonName: String(r["Season Name"] ?? "").trim() || undefined,
          dateFrom: String(r["Date From"] ?? "").trim() || undefined,
          dateTo: String(r["Date To"] ?? "").trim() || undefined,
          isActive: r["Active"] !== false && r["Active"] !== "FALSE" && r["Active"] !== 0,
          rates: VEHICLE_COLS.map((v) => ({
            vehicleType: v.key,
            rentEGP: Number(r[v.rentCol]) || 0,
            tipEGP: Number(r[v.tipCol]) || 0,
            repAllowEGP: Number(r[v.repCol]) || 0,
          })),
        })).filter((r) => r.destinationCode && r.routeNameEn);
        if (parsed.length === 0) { toast.error("No valid rows found in file"); return; }
        bulkImport.mutate(parsed);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  function toggleDest(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function openNewDest() {
    setDestDialog({ open: true, code: "", nameEn: "", nameAr: "" });
  }
  function openEditDest(d: { id: string; code: string; nameEn: string; nameAr: string | null }) {
    setDestDialog({ open: true, id: d.id, code: d.code, nameEn: d.nameEn, nameAr: d.nameAr ?? "" });
  }

  function submitDest() {
    if (destDialog.id) {
      updateDest.mutate({ id: destDialog.id, data: { code: destDialog.code, nameEn: destDialog.nameEn, nameAr: destDialog.nameAr } });
    } else {
      createDest.mutate({ code: destDialog.code, nameEn: destDialog.nameEn, nameAr: destDialog.nameAr });
    }
  }

  function openNewRoute(destinationId: string) {
    setRouteDialog({ open: true, destinationId, nameEn: "", nameAr: "" });
  }
  function openEditRoute(r: { id: string; destinationId: string; nameEn: string; nameAr: string | null }) {
    setRouteDialog({ open: true, id: r.id, destinationId: r.destinationId, nameEn: r.nameEn, nameAr: r.nameAr ?? "" });
  }

  function submitRoute() {
    if (routeDialog.id) {
      updateRoute.mutate({ id: routeDialog.id, data: { nameEn: routeDialog.nameEn, nameAr: routeDialog.nameAr } });
    } else {
      createRoute.mutate({ destinationId: routeDialog.destinationId, nameEn: routeDialog.nameEn, nameAr: routeDialog.nameAr });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "dest") deleteDest.mutate({ id: deleteTarget.id });
    else deleteRoute.mutate({ id: deleteTarget.id });
    setDeleteTarget(null);
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bus className="size-6" /> Transportation Rates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage destinations, routes, and vehicle rate seasons.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const buf = exportTransportRatesExcel(destinations);
              const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "transport-rates.xlsx"; a.click(); URL.revokeObjectURL(url);
            }}
          >
            <Download className="size-4 mr-1" /> Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkImport.isPending}
            onClick={() => importRef.current?.click()}
          >
            <Upload className="size-4 mr-1" /> {bulkImport.isPending ? "Importing…" : "Import"}
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          <Button onClick={openNewDest} size="sm">
            <Plus className="size-4 mr-1" /> Add Destination
          </Button>
        </div>
      </div>

      {destinations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No destinations yet. Add a destination to start building transport rates.
          </CardContent>
        </Card>
      )}

      {destinations.map((dest) => (
        <Card key={dest.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-left"
                onClick={() => toggleDest(dest.id)}
              >
                {expanded[dest.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <Badge variant="outline" className="font-mono">{dest.code}</Badge>
                <CardTitle className="text-base">{dest.nameEn}</CardTitle>
                {dest.nameAr && <span className="text-sm text-muted-foreground" dir="rtl">{dest.nameAr}</span>}
                <Badge variant="secondary">{dest.routes.length} routes</Badge>
              </button>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEditDest(dest)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: "dest", id: dest.id })}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {expanded[dest.id] && (
            <CardContent>
              <div className="flex justify-end mb-3">
                <Button size="sm" variant="outline" onClick={() => openNewRoute(dest.id)}>
                  <Plus className="size-3.5 mr-1" /> Add Route
                </Button>
              </div>
              {dest.routes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No routes yet.</p>
              ) : (
                <div className="space-y-1">
                  {dest.routes.map((route) => {
                    const activeSeason = route.seasons.find((s) => s.isActive);
                    return (
                      <div key={route.id} className="flex items-center justify-between border rounded px-3 py-2 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">{route.nameEn}</span>
                          {route.nameAr && <span className="text-xs text-muted-foreground" dir="rtl">{route.nameAr}</span>}
                          <Badge variant="secondary" className="text-xs">
                            {route.seasons.length} season{route.seasons.length !== 1 ? "s" : ""}
                          </Badge>
                          {activeSeason && (
                            <Badge variant="default" className="text-xs">
                              Active: {activeSeason.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/tour-ops/master-data/transport/${route.id}`}>Rates</Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditRoute(route)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: "route", id: route.id })}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Destination dialog */}
      <Dialog open={destDialog.open} onOpenChange={(o) => !o && setDestDialog({ open: false, code: "", nameEn: "", nameAr: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{destDialog.id ? "Edit Destination" : "New Destination"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <div className="flex gap-2">
                {OPS_DESTINATION_CODES.map((d) => (
                  <Button
                    key={d.code}
                    size="sm"
                    variant={destDialog.code === d.code ? "default" : "outline"}
                    onClick={() => setDestDialog((p) => ({ ...p, code: d.code, nameEn: p.nameEn || d.label.split(" ")[0] }))}
                  >
                    {d.code}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="e.g. CAI"
                value={destDialog.code}
                onChange={(e) => setDestDialog((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name (English)</Label>
              <Input value={destDialog.nameEn} onChange={(e) => setDestDialog((p) => ({ ...p, nameEn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Name (Arabic)</Label>
              <Input dir="rtl" value={destDialog.nameAr} onChange={(e) => setDestDialog((p) => ({ ...p, nameAr: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDestDialog({ open: false, code: "", nameEn: "", nameAr: "" })}>Cancel</Button>
            <Button onClick={submitDest} disabled={!destDialog.code || !destDialog.nameEn}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route dialog */}
      <Dialog open={routeDialog.open} onOpenChange={(o) => !o && setRouteDialog({ open: false, destinationId: "", nameEn: "", nameAr: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{routeDialog.id ? "Edit Route" : "New Route"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Route Name (English)</Label>
              <Input placeholder="e.g. Airport → Mena House" value={routeDialog.nameEn} onChange={(e) => setRouteDialog((p) => ({ ...p, nameEn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Route Name (Arabic)</Label>
              <Input dir="rtl" value={routeDialog.nameAr} onChange={(e) => setRouteDialog((p) => ({ ...p, nameAr: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteDialog({ open: false, destinationId: "", nameEn: "", nameAr: "" })}>Cancel</Button>
            <Button onClick={submitRoute} disabled={!routeDialog.nameEn}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "dest" ? "Destination" : "Route"}?</AlertDialogTitle>
            <AlertDialogDescription>This will also delete all associated routes and rate seasons.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
