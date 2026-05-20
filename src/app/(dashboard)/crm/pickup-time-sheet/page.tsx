"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Save, Clock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

// cell state: key = `${hotelId}::${excursionId}`, value = "HH:MM" | ""
type CellMap = Record<string, string>;

function buildKey(hotelId: string, excursionId: string) {
  return `${hotelId}::${excursionId}`;
}

function TimeCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-24 rounded border bg-background px-1.5 text-sm text-center tabular-nums",
        "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
        value ? "border-primary/40 text-foreground" : "border-input text-muted-foreground",
      )}
    />
  );
}

export default function PickupTimeSheetPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [cells, setCells] = useState<CellMap>({});
  const [dirty, setDirty] = useState(false);
  const savedCells = useRef<CellMap>({});

  const { data: destinations, isLoading: destsLoading } =
    trpc.crm.pickupTimeSheet.listDestinations.useQuery();

  const { data: sheet, isLoading: sheetLoading } =
    trpc.crm.pickupTimeSheet.getSheet.useQuery(
      { destinationId: selectedDestId! },
      { enabled: !!selectedDestId },
    );

  // Auto-select first destination
  useEffect(() => {
    if (destinations?.length && !selectedDestId) {
      setSelectedDestId(destinations[0].id);
    }
  }, [destinations, selectedDestId]);

  // Populate cell state when sheet loads
  useEffect(() => {
    if (!sheet) return;
    const map: CellMap = {};
    for (const t of sheet.times) {
      map[buildKey(t.hotelId, t.excursionId)] = t.pickupTime;
    }
    setCells(map);
    savedCells.current = map;
    setDirty(false);
  }, [sheet]);

  const handleChange = useCallback((hotelId: string, excursionId: string, value: string) => {
    setCells((prev) => {
      const next = { ...prev, [buildKey(hotelId, excursionId)]: value };
      return next;
    });
    setDirty(true);
  }, []);

  const utils = trpc.useUtils();

  const saveMutation = trpc.crm.pickupTimeSheet.saveSheet.useMutation({
    onSuccess: ({ saved }) => {
      savedCells.current = cells;
      setDirty(false);
      utils.crm.pickupTimeSheet.getSheet.invalidate({ destinationId: selectedDestId! });
      toast.success(`Saved ${saved} pickup time${saved !== 1 ? "s" : ""}`);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    if (!selectedDestId) return;
    const nonEmpty = Object.entries(cells)
      .filter(([, v]) => v !== "")
      .map(([key, pickupTime]) => {
        const [hotelId, excursionId] = key.split("::");
        return { hotelId, excursionId, pickupTime };
      });
    saveMutation.mutate({ destinationId: selectedDestId, cells: nonEmpty });
  }

  // Switch destination: prompt if dirty
  function switchDestination(id: string) {
    if (dirty && !confirm("You have unsaved changes. Discard and switch destination?")) return;
    setSelectedDestId(id);
    setCells({});
    setDirty(false);
  }

  const selectedDest = destinations?.find((d) => d.id === selectedDestId);

  return (

    <PermissionGuard permission="crm:booking:read">
      <div className="flex flex-1 flex-col gap-0 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("pickUpTimeSheet")}</h1>
          <p className="text-sm text-muted-foreground">
            Set hotel pickup times per excursion, grouped by destination
          </p>
        </div>
        <Button
          size="sm"
          disabled={!dirty || saveMutation.isPending}
          onClick={handleSave}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {saveMutation.isPending ? tc("saving") : tc("save")}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Destinations ── */}
        <aside className="w-52 shrink-0 border-r overflow-y-auto">
          <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Destinations
          </p>
          {destsLoading ? (
            <div className="space-y-1.5 px-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : !destinations?.length ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <MapPin className="h-7 w-7 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                No destinations with active hotels found.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 px-2 pb-4">
              {destinations.map((d) => (
                <button
                  key={d.id}
                  onClick={() => switchDestination(d.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    selectedDestId === d.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {d.name}
                  <span className="ml-1.5 text-[10px] opacity-60">{d.code}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Right: Grid ── */}
        <main className="flex-1 overflow-auto p-6">
          {!selectedDestId ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a destination to edit its sheet</p>
              </div>
            </div>
          ) : sheetLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !sheet?.hotels.length ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No active hotels in <strong>{selectedDest?.name}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Assign hotels to this destination in the Contracting module.
              </p>
            </div>
          ) : !sheet?.excursions.length ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No active excursions found</p>
              <p className="text-xs text-muted-foreground">
                Create excursions in the Excursions catalog first.
              </p>
            </div>
          ) : (
            <>
              {/* Summary badges */}
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-base font-semibold">{selectedDest?.name}</h2>
                <Badge variant="secondary">{sheet.hotels.length} hotels</Badge>
                <Badge variant="secondary">{sheet.excursions.length} excursions</Badge>
                {dirty && (
                  <Badge variant="outline" className="border-amber-400 text-amber-600">
                    Unsaved changes
                  </Badge>
                )}
              </div>

              {/* Frozen-header table */}
              <div className="overflow-auto rounded-lg border">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      {/* Corner cell */}
                      <th className="sticky left-0 z-20 min-w-[200px] max-w-[240px] border-b border-r bg-muted/80 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground backdrop-blur">
                        Hotel \ Excursion
                      </th>
                      {sheet.excursions.map((exc) => (
                        <th
                          key={exc.id}
                          className="border-b border-r px-3 py-2.5 text-center text-xs font-semibold text-foreground whitespace-nowrap"
                          title={exc.name}
                        >
                          <div className="max-w-[120px] truncate">{exc.name}</div>
                          <div className="text-[10px] font-normal text-muted-foreground">{exc.code}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.hotels.map((hotel, hIdx) => (
                      <tr
                        key={hotel.id}
                        className={cn(
                          "transition-colors hover:bg-muted/20",
                          hIdx % 2 === 1 && "bg-muted/10",
                        )}
                      >
                        {/* Hotel name — sticky left */}
                        <td className="sticky left-0 z-10 min-w-[200px] max-w-[240px] border-b border-r bg-background px-4 py-1.5 font-medium backdrop-blur">
                          <div className="truncate">{hotel.name}</div>
                          <div className="text-[10px] text-muted-foreground">{hotel.code}</div>
                        </td>

                        {/* Time cells */}
                        {sheet.excursions.map((exc) => (
                          <td
                            key={exc.id}
                            className="border-b border-r px-2 py-1.5 text-center"
                          >
                            <TimeCell
                              value={cells[buildKey(hotel.id, exc.id)] ?? ""}
                              onChange={(v) => handleChange(hotel.id, exc.id, v)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Leave a cell empty to indicate no pickup from that hotel for that excursion.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  

    </PermissionGuard>

  );
}
