"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Map, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
import { OPS_DESTINATION_CODES } from "@/lib/constants/tour-ops";
import { exportSightseeingRatesExcel } from "@/lib/export/tour-ops-sightseeing-excel";

type EntryDialog = { open: boolean; id?: string; destinationCode: string; nameEn: string; nameAr: string };
const emptyEntry = (): EntryDialog => ({ open: false, destinationCode: "", nameEn: "", nameAr: "" });

export default function SightseeingMasterDataPage() {
  const utils = trpc.useUtils();
  const [filterDest, setFilterDest] = useState<string>("ALL");
  const { data: entries = [], isLoading } = trpc.tourOps.sightseeing.list.useQuery({
    destinationCode: filterDest === "ALL" ? undefined : filterDest,
  });
  const importRef = useRef<HTMLInputElement>(null);

  const [dialog, setDialog] = useState<EntryDialog>(emptyEntry());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const create = trpc.tourOps.sightseeing.create.useMutation({
    onSuccess: () => { utils.tourOps.sightseeing.list.invalidate(); setDialog(emptyEntry()); toast.success("Entry created"); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.tourOps.sightseeing.update.useMutation({
    onSuccess: () => { utils.tourOps.sightseeing.list.invalidate(); setDialog(emptyEntry()); toast.success("Entry updated"); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.tourOps.sightseeing.delete.useMutation({
    onSuccess: () => { utils.tourOps.sightseeing.list.invalidate(); toast.success("Entry deleted"); },
  });
  const bulkImport = trpc.tourOps.sightseeing.bulkImport.useMutation({
    onSuccess: (res) => {
      utils.tourOps.sightseeing.list.invalidate();
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
        const parsed = rows.map((r) => ({
          destinationCode: String(r["Destination Code"] ?? "").trim(),
          nameEn: String(r["Name (EN)"] ?? "").trim(),
          nameAr: String(r["Name (AR)"] ?? "").trim() || undefined,
          seasonName: String(r["Season Name"] ?? "").trim() || undefined,
          dateFrom: String(r["Date From"] ?? "").trim() || undefined,
          dateTo: String(r["Date To"] ?? "").trim() || undefined,
          isActive: r["Active"] !== false && r["Active"] !== "FALSE" && r["Active"] !== 0,
          priceEGP: Number(r["Price EGP"]) || 0,
        })).filter((r) => r.destinationCode && r.nameEn);
        if (parsed.length === 0) { toast.error("No valid rows found in file"); return; }
        bulkImport.mutate(parsed);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  function submitEntry() {
    if (dialog.id) {
      update.mutate({ id: dialog.id, data: { destinationCode: dialog.destinationCode, nameEn: dialog.nameEn, nameAr: dialog.nameAr } });
    } else {
      create.mutate({ destinationCode: dialog.destinationCode, nameEn: dialog.nameEn, nameAr: dialog.nameAr });
    }
  }

  const grouped = entries.reduce<Record<string, typeof entries>>((acc, e) => {
    (acc[e.destinationCode] ??= []).push(e);
    return acc;
  }, {});

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="size-6" /> Sightseeing Entrances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage entrance fees with seasonal pricing.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterDest} onValueChange={setFilterDest}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Destinations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Destinations</SelectItem>
              {OPS_DESTINATION_CODES.map((d) => (
                <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const buf = exportSightseeingRatesExcel(entries);
              const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "sightseeing-rates.xlsx"; a.click(); URL.revokeObjectURL(url);
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
          <Button size="sm" onClick={() => setDialog({ ...emptyEntry(), open: true })}>
            <Plus className="size-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      {entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No sightseeing entries yet.
          </CardContent>
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
              {items.map((entry) => {
                const activeSeason = entry.seasons.find((s) => s.isActive);
                return (
                  <div key={entry.id} className="flex items-center justify-between border rounded px-3 py-2 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{entry.nameEn}</span>
                      {entry.nameAr && <span className="text-xs text-muted-foreground" dir="rtl">{entry.nameAr}</span>}
                      <Badge variant="secondary" className="text-xs">{entry.seasons.length} season{entry.seasons.length !== 1 ? "s" : ""}</Badge>
                      {activeSeason && (
                        <Badge variant="default" className="text-xs">
                          {activeSeason.priceEGP.toString()} EGP
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/tour-ops/master-data/sightseeing/${entry.id}`}>Seasons</Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, id: entry.id, destinationCode: entry.destinationCode, nameEn: entry.nameEn, nameAr: entry.nameAr ?? "" })}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(entry.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog(emptyEntry())}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.id ? "Edit Entry" : "New Sightseeing Entry"}</DialogTitle></DialogHeader>
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
              <Label>Name (English)</Label>
              <Input value={dialog.nameEn} onChange={(e) => setDialog((p) => ({ ...p, nameEn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Name (Arabic)</Label>
              <Input dir="rtl" value={dialog.nameAr} onChange={(e) => setDialog((p) => ({ ...p, nameAr: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(emptyEntry())}>Cancel</Button>
            <Button onClick={submitEntry} disabled={!dialog.destinationCode || !dialog.nameEn}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription>All rate seasons for this entry will also be deleted.</AlertDialogDescription>
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
