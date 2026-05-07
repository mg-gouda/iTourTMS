"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { Plus, Truck, MapPin, ChevronUp, ChevronDown, Trash2, Crosshair, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { HotelPin } from "@/components/crm/dispatch-map";

// SSR-safe map import
const DispatchMap = dynamic(() => import("@/components/crm/dispatch-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

const RUN_COLORS = [
  { bg: "bg-blue-500",   border: "border-blue-400",   text: "text-blue-600",   hex: "#3b82f6" },
  { bg: "bg-emerald-500", border: "border-emerald-400", text: "text-emerald-600", hex: "#10b981" },
  { bg: "bg-amber-500",  border: "border-amber-400",  text: "text-amber-600",  hex: "#f59e0b" },
  { bg: "bg-violet-500", border: "border-violet-400", text: "text-violet-600", hex: "#8b5cf6" },
  { bg: "bg-red-500",    border: "border-red-400",    text: "text-red-600",    hex: "#ef4444" },
  { bg: "bg-cyan-500",   border: "border-cyan-400",   text: "text-cyan-600",   hex: "#06b6d4" },
];

interface RunStop { hotelId: string; sequence: number; paxCount: number }
interface Run { id: string; runNumber: number; repId: string; notes: string; stops: RunStop[] }

let runIdCounter = 0;
function newRunId() { return `run-${++runIdCounter}`; }

export default function ExcursionDispatchPage() {
  // Filters
  const [excursionId, setExcursionId] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Map state
  const [placingAssembly, setPlacingAssembly] = useState(false);
  const [assembly, setAssembly] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // Runs
  const [runs, setRuns] = useState<Run[]>([]);

  const utils = trpc.useUtils();
  const { data: excursions } = trpc.crm.excursionDispatch.listExcursions.useQuery();
  const { data: reps } = trpc.crm.excursionDispatch.listReps.useQuery();

  const { data: hotelData, isLoading: hotelsLoading } = trpc.crm.excursionDispatch.getHotels.useQuery(
    { excursionId, date },
    { enabled: !!excursionId && !!date },
  );

  const { data: savedDispatch } = trpc.crm.excursionDispatch.getDispatch.useQuery(
    { excursionId, date },
    { enabled: !!excursionId && !!date },
  );

  // Load saved dispatch on filter change
  useEffect(() => {
    if (savedDispatch) {
      setAssembly(
        savedDispatch.assemblyPointLat != null && savedDispatch.assemblyPointLng != null
          ? { lat: savedDispatch.assemblyPointLat, lng: savedDispatch.assemblyPointLng, name: savedDispatch.assemblyPointName ?? "" }
          : null,
      );
      setRuns(
        savedDispatch.runs.map((r) => ({
          id: newRunId(),
          runNumber: r.runNumber,
          repId: r.repId ?? "",
          notes: r.notes ?? "",
          stops: r.stops.map((s) => ({ hotelId: s.hotelId, sequence: s.sequence, paxCount: s.paxCount })),
        })),
      );
    } else {
      setAssembly(null);
      setRuns([]);
    }
  }, [savedDispatch?.id, excursionId, date]);

  const [pendingGenerate, setPendingGenerate] = useState(false);

  const generateMutation = trpc.crm.excursionDispatch.generateJobs.useMutation({
    onSuccess: ({ created }) => {
      utils.crm.excursionDispatch.getDispatch.invalidate({ excursionId, date });
      toast.success(`${created} traffic job${created !== 1 ? "s" : ""} generated`);
      setPendingGenerate(false);
    },
    onError: (e) => { toast.error(e.message); setPendingGenerate(false); },
  });

  const saveMutation = trpc.crm.excursionDispatch.saveDispatch.useMutation({
    onSuccess: () => {
      utils.crm.excursionDispatch.getDispatch.invalidate({ excursionId, date });
      if (pendingGenerate) {
        generateMutation.mutate({ excursionId, date });
      } else {
        toast.success("Dispatch saved");
      }
    },
    onError: (e) => { toast.error(e.message); setPendingGenerate(false); },
  });

  // Build hotel pin list with run index
  const assignedHotelIds = new Set(runs.flatMap((r) => r.stops.map((s) => s.hotelId)));
  const hotels: HotelPin[] = (hotelData ?? []).map((h) => {
    const runIdx = runs.findIndex((r) => r.stops.some((s) => s.hotelId === h.id));
    return { id: h.id, name: h.name, code: h.code, latitude: h.latitude, longitude: h.longitude, pax: h.pax, runIndex: runIdx === -1 ? null : runIdx };
  });
  const unassigned = hotels.filter((h) => !assignedHotelIds.has(h.id));

  // Run actions
  function addRun() {
    setRuns((prev) => [...prev, { id: newRunId(), runNumber: prev.length + 1, repId: "", notes: "", stops: [] }]);
  }

  function removeRun(id: string) {
    setRuns((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, runNumber: i + 1 })));
  }

  function assignToRun(hotelId: string, runId: string) {
    const hotel = hotelData?.find((h) => h.id === hotelId);
    if (!hotel) return;
    setRuns((prev) =>
      prev.map((r) => {
        if (r.id !== runId) return r;
        if (r.stops.some((s) => s.hotelId === hotelId)) return r;
        return {
          ...r,
          stops: [...r.stops, { hotelId, sequence: r.stops.length, paxCount: hotel.pax }],
        };
      }),
    );
  }

  function removeStop(runId: string, hotelId: string) {
    setRuns((prev) =>
      prev.map((r) =>
        r.id !== runId
          ? r
          : { ...r, stops: r.stops.filter((s) => s.hotelId !== hotelId).map((s, i) => ({ ...s, sequence: i })) },
      ),
    );
  }

  function moveStop(runId: string, hotelId: string, dir: -1 | 1) {
    setRuns((prev) =>
      prev.map((r) => {
        if (r.id !== runId) return r;
        const stops = [...r.stops];
        const idx = stops.findIndex((s) => s.hotelId === hotelId);
        const next = idx + dir;
        if (next < 0 || next >= stops.length) return r;
        [stops[idx], stops[next]] = [stops[next], stops[idx]];
        return { ...r, stops: stops.map((s, i) => ({ ...s, sequence: i })) };
      }),
    );
  }

  function updateRun(id: string, field: "repId" | "notes", value: string) {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  const handleAssemblyPlace = useCallback((lat: number, lng: number) => {
    setAssembly((prev) => ({ lat, lng, name: prev?.name ?? "" }));
    setPlacingAssembly(false);
  }, []);

  function buildSavePayload() {
    return {
      excursionId,
      date,
      assemblyPointName: assembly?.name || undefined,
      assemblyPointLat: assembly?.lat,
      assemblyPointLng: assembly?.lng,
      runs: runs.map((r) => ({
        runNumber: r.runNumber,
        repId: r.repId || undefined,
        notes: r.notes || undefined,
        stops: r.stops,
      })),
    };
  }

  function handleSave() {
    if (!excursionId) { toast.error("Select an excursion"); return; }
    setPendingGenerate(false);
    saveMutation.mutate(buildSavePayload());
  }

  function handleGenerateJobs() {
    if (!excursionId) { toast.error("Select an excursion"); return; }
    if (runs.length === 0) { toast.error("Create at least one run first"); return; }
    if (runs.some((r) => r.stops.length === 0)) { toast.error("All runs must have at least one hotel"); return; }
    // Always save first, then generate in onSuccess
    setPendingGenerate(true);
    saveMutation.mutate(buildSavePayload());
  }

  const dispatched = savedDispatch?.status === "DISPATCHED";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exc. Dispatch</h1>
          <p className="text-sm text-muted-foreground">
            Group hotel pickups into runs · place assembly point · generate traffic jobs
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={(saveMutation.isPending && !pendingGenerate) || !excursionId}>
            {saveMutation.isPending && !pendingGenerate ? "Saving…" : "Save"}
          </Button>
          <Button
            size="sm"
            onClick={handleGenerateJobs}
            disabled={saveMutation.isPending || generateMutation.isPending || runs.length === 0 || dispatched}
            className="gap-1.5"
          >
            <Truck className="h-3.5 w-3.5" />
            {dispatched
              ? "Dispatched"
              : pendingGenerate && (saveMutation.isPending || generateMutation.isPending)
              ? "Generating…"
              : "Generate Traffic Jobs"}
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-6 py-2.5 shrink-0">
        <Select value={excursionId || "none"} onValueChange={(v) => setExcursionId(v === "none" ? "" : v)}>
          <SelectTrigger className="h-8 w-64 bg-background text-sm">
            <SelectValue placeholder="Select excursion…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Select excursion —</SelectItem>
            {excursions?.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="h-8 w-40 bg-background text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        {dispatched && (
          <Badge className="bg-green-600 hover:bg-green-700 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Dispatched
          </Badge>
        )}
        {hotelData && (
          <span className="text-xs text-muted-foreground ml-auto">
            {hotelData.length} hotel{hotelData.length !== 1 ? "s" : ""} ·{" "}
            {hotelData.reduce((s, h) => s + h.pax, 0)} pax ·{" "}
            {unassigned.length} unassigned
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map (left 60%) */}
        <div className="flex-1 relative p-3 min-h-0">
          {!excursionId ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">Select an excursion to see the map</p>
            </div>
          ) : (
            <>
              <div className="h-full">
                <DispatchMap
                  hotels={hotels}
                  assembly={assembly}
                  onAssemblyPlace={handleAssemblyPlace}
                  placingAssembly={placingAssembly}
                />
              </div>
              {/* Map overlay controls */}
              <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant={placingAssembly ? "default" : "outline"}
                  className="gap-1.5 shadow-md bg-background/90 backdrop-blur"
                  onClick={() => setPlacingAssembly((v) => !v)}
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  {placingAssembly ? "Click map to place…" : "Place Assembly Point"}
                </Button>
                {assembly && (
                  <div className="rounded-md border bg-background/95 px-3 py-2 shadow-md backdrop-blur text-xs space-y-1.5">
                    <p className="font-semibold text-red-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Assembly Point
                    </p>
                    <Input
                      className="h-7 text-xs"
                      placeholder="Name (e.g. Senzo Mall)"
                      value={assembly.name}
                      onChange={(e) => setAssembly((a) => a ? { ...a, name: e.target.value } : a)}
                    />
                    <p className="text-muted-foreground">{assembly.lat.toFixed(5)}, {assembly.lng.toFixed(5)}</p>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive p-0" onClick={() => setAssembly(null)}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Run builder (right 40%) */}
        <aside className="w-96 shrink-0 border-l overflow-y-auto flex flex-col">
          {/* Unassigned hotels */}
          <div className="border-b p-3 shrink-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unassigned Hotels {unassigned.length > 0 && <span className="text-destructive">({unassigned.length})</span>}
            </p>
            {hotelsLoading && excursionId ? (
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : unassigned.length === 0 && hotelData ? (
              <p className="text-xs text-muted-foreground py-1">
                {hotelData.length === 0 ? "No bookings found for this excursion + date." : "All hotels assigned ✓"}
              </p>
            ) : (
              <div className="space-y-1">
                {unassigned.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{h.name}</p>
                      <p className="text-[10px] text-muted-foreground">{h.pax} pax {!h.latitude && <span className="text-amber-500">· no GPS</span>}</p>
                    </div>
                    {runs.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground">Add a run →</span>
                    ) : (
                      <Select onValueChange={(runId) => assignToRun(h.id, runId)}>
                        <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue placeholder="Add to…" /></SelectTrigger>
                        <SelectContent>
                          {runs.map((r) => (
                            <SelectItem key={r.id} value={r.id}>Run {r.runNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Runs */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Runs</p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addRun}>
                <Plus className="h-3 w-3" /> Add Run
              </Button>
            </div>

            {runs.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
                <Truck className="h-7 w-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No runs yet — click Add Run</p>
              </div>
            )}

            {runs.map((run, runIdx) => {
              const color = RUN_COLORS[runIdx % RUN_COLORS.length];
              const runPax = run.stops.reduce((s, st) => {
                const h = hotelData?.find((h) => h.id === st.hotelId);
                return s + (h?.pax ?? st.paxCount);
              }, 0);
              const hasJob = savedDispatch?.runs.find((r) => r.runNumber === run.runNumber)?.trafficJobId;

              return (
                <Card key={run.id} className={cn("overflow-hidden border-l-4", color.border.replace("border-", "border-l-"))}>
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full shrink-0", color.bg)} />
                        <CardTitle className="text-sm">Run {run.runNumber}</CardTitle>
                        <span className="text-xs text-muted-foreground">{runPax} pax</span>
                        {hasJob && (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-400">Job created</Badge>
                        )}
                      </div>
                      <Button
                        size="icon" variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRun(run.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    {/* Rep */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Excursion Rep</label>
                      <Select value={run.repId || "none"} onValueChange={(v) => updateRun(run.id, "repId", v === "none" ? "" : v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="— No rep —" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— No rep —</SelectItem>
                          {reps?.map((r) => <SelectItem key={r.id} value={r.id}>{r.user.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stop list */}
                    {run.stops.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">No hotels — assign from the list above</p>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Pickup sequence</label>
                        {run.stops.map((stop, si) => {
                          const hotel = hotelData?.find((h) => h.id === stop.hotelId);
                          return (
                            <div key={stop.hotelId} className="flex items-center gap-1.5 rounded border bg-background px-2 py-1.5">
                              <span className={cn("text-[10px] font-bold w-4 shrink-0", color.text)}>{si + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{hotel?.name ?? stop.hotelId}</p>
                                <p className="text-[10px] text-muted-foreground">{hotel?.pax ?? stop.paxCount} pax</p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveStop(run.id, stop.hotelId, -1)} disabled={si === 0}>
                                  <ChevronUp className="h-2.5 w-2.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveStop(run.id, stop.hotelId, 1)} disabled={si === run.stops.length - 1}>
                                  <ChevronDown className="h-2.5 w-2.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => removeStop(run.id, stop.hotelId)}>
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Warning for hotels without GPS */}
          {hotelData?.some((h) => !h.latitude) && (
            <div className="border-t px-3 py-2 shrink-0">
              <p className="flex items-center gap-1.5 text-[10px] text-amber-600">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Some hotels lack GPS coordinates and won't appear on the map. Set lat/lng in Contracting → Hotels.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
