"use client";

import { useState } from "react";
import { Hotel, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const ROOM_BASIS_LABELS: Record<string, string> = {
  singleRate: "SGL",
  doubleRate: "DBL",
  tripleRate: "TPL",
};

// Standard mode — used by templates page (single rate selection)
export interface AccommodationSelection {
  description: string;
  supplierId?: string;
  unitCost: number;
  currency: string;
  notes: string;
  refModuleEntityId?: string;
  refModuleEntityType?: string;
}

// Room-breakdown mode — used by quotation calculator (per-type room counts)
export interface AccommodationRoomBreakdown {
  description: string;
  currency: string;
  nights: number;
  sglRooms: number;
  sglRate: number;
  dblRooms: number;
  dblRate: number;
  tplRooms: number;
  tplRate: number;
  refHotelId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  serviceDate?: string;
  // Standard mode (templates page)
  onSelect?: (data: AccommodationSelection) => void;
  // Room-breakdown mode (quotation calculator)
  mode?: "standard" | "room-breakdown";
  onSelectRooms?: (data: AccommodationRoomBreakdown) => void;
  title?: string;
}

export function AccommodationPickerDialog({
  open,
  onClose,
  serviceDate,
  onSelect,
  mode = "standard",
  onSelectRooms,
  title,
}: Props) {
  const [tab, setTab] = useState<"contract" | "manual">("contract");

  // Contract tab state
  const [hotelId, setHotelId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [mealBasisId, setMealBasisId] = useState("");
  const [roomBasis, setRoomBasis] = useState<"singleRate" | "doubleRate" | "tripleRate">("doubleRate");

  // Room-breakdown extra state
  const [sglRooms, setSglRooms] = useState(0);
  const [dblRooms, setDblRooms] = useState(1);
  const [tplRooms, setTplRooms] = useState(0);
  const [nights, setNights] = useState(1);

  // Manual tab state
  const [manualDesc, setManualDesc] = useState("");
  const [manualCost, setManualCost] = useState(0);
  const [manualCurrency, setManualCurrency] = useState("USD");
  const [manualMeal, setManualMeal] = useState("");
  const [manualRoomType, setManualRoomType] = useState("DBL");
  // Manual room-breakdown
  const [manualSglRooms, setManualSglRooms] = useState(0);
  const [manualSglRate, setManualSglRate] = useState(0);
  const [manualDblRooms, setManualDblRooms] = useState(1);
  const [manualDblRate, setManualDblRate] = useState(0);
  const [manualTplRooms, setManualTplRooms] = useState(0);
  const [manualTplRate, setManualTplRate] = useState(0);
  const [manualNights, setManualNights] = useState(1);

  const { data: hotels, isLoading: hotelsLoading } = trpc.tourOps.lookup.hotels.useQuery(
    undefined,
    { enabled: open && tab === "contract" }
  );

  const { data: rates, isLoading: ratesLoading } = trpc.tourOps.lookup.hotelRates.useQuery(
    { hotelId, serviceDate },
    { enabled: open && tab === "contract" && !!hotelId }
  );

  const selectedHotel = hotels?.find((h) => h.id === hotelId);
  const selectedRate = rates?.rates[roomBasis];
  const selectedRoomType = rates?.roomTypes.find((r) => r.id === roomTypeId);
  const selectedMealBasis = rates?.mealBases.find((m) => m.id === mealBasisId);

  const isRoomBreakdown = mode === "room-breakdown";

  function handleContractSelect() {
    if (!selectedHotel || !rates) return;

    const roomLabel = selectedRoomType?.name ?? ROOM_BASIS_LABELS[roomBasis];
    const mealLabel = selectedMealBasis?.name ?? "";
    const cost = selectedRate ?? rates.rates.baseRate ?? 0;

    if (isRoomBreakdown) {
      onSelectRooms?.({
        description: `${selectedHotel.name}${mealLabel ? ` (${mealLabel})` : ""}`,
        currency: rates.currency,
        nights,
        sglRooms,
        sglRate: rates.rates.singleRate ?? 0,
        dblRooms,
        dblRate: rates.rates.doubleRate ?? 0,
        tplRooms,
        tplRate: rates.rates.tripleRate ?? 0,
        refHotelId: hotelId,
      });
    } else {
      onSelect?.({
        description: `${selectedHotel.name} — ${roomLabel}${mealLabel ? ` (${mealLabel})` : ""}`,
        unitCost: cost,
        currency: rates.currency,
        notes: `Contract: ${rates.contractName}. Room: ${roomLabel}. Meal: ${mealLabel || "—"}. Basis: ${rates.rateBasis === "PER_PERSON" ? "per person" : "per room"}.`,
        refModuleEntityId: hotelId,
        refModuleEntityType: "hotel",
      });
    }
    handleClose();
  }

  function handleManualSelect() {
    if (isRoomBreakdown) {
      onSelectRooms?.({
        description: manualDesc,
        currency: manualCurrency,
        nights: manualNights,
        sglRooms: manualSglRooms,
        sglRate: manualSglRate,
        dblRooms: manualDblRooms,
        dblRate: manualDblRate,
        tplRooms: manualTplRooms,
        tplRate: manualTplRate,
        refHotelId: "",
      });
    } else {
      onSelect?.({
        description: `${manualDesc} — ${manualRoomType}${manualMeal ? ` (${manualMeal})` : ""}`,
        unitCost: manualCost,
        currency: manualCurrency,
        notes: `Room: ${manualRoomType}. Meal: ${manualMeal || "—"}.`,
      });
    }
    handleClose();
  }

  function handleClose() {
    setHotelId("");
    setRoomTypeId("");
    setMealBasisId("");
    setRoomBasis("doubleRate");
    setSglRooms(0);
    setDblRooms(1);
    setTplRooms(0);
    setNights(1);
    setManualDesc("");
    setManualCost(0);
    setManualCurrency("USD");
    setManualMeal("");
    setManualRoomType("DBL");
    setManualSglRooms(0);
    setManualSglRate(0);
    setManualDblRooms(1);
    setManualDblRate(0);
    setManualTplRooms(0);
    setManualTplRate(0);
    setManualNights(1);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className={isRoomBreakdown ? "max-w-xl" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-4 w-4" />
            {title ?? (isRoomBreakdown ? "Select Accommodation" : "Select Accommodation")}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "contract" | "manual")}>
          <TabsList className="w-full">
            <TabsTrigger value="contract" className="flex-1">
              <Layers className="mr-1.5 h-3.5 w-3.5" /> From Contract
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              Manual Entry
            </TabsTrigger>
          </TabsList>

          {/* ── Contract Tab ── */}
          <TabsContent value="contract" className="mt-4 space-y-4">
            {hotelsLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : !hotels?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hotels with active contracts found.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hotel</Label>
                  <Select value={hotelId} onValueChange={(v) => { setHotelId(v); setRoomTypeId(""); setMealBasisId(""); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select hotel…" />
                    </SelectTrigger>
                    <SelectContent>
                      {hotels.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} <span className="text-muted-foreground ml-1">({h.city})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hotelId && (
                  ratesLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : !rates ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No contract rates available for this hotel.</p>
                  ) : (
                    <>
                      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        Contract: <span className="font-medium text-foreground">{rates.contractName}</span>
                        {" · "}Currency: <span className="font-medium text-foreground">{rates.currency}</span>
                        {rates.season && (
                          <> · Season: <span className="font-medium text-foreground">
                            {new Date(rates.season.dateFrom).toLocaleDateString()} – {new Date(rates.season.dateTo).toLocaleDateString()}
                          </span></>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Room Type</Label>
                          <Select value={roomTypeId} onValueChange={setRoomTypeId}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Any…" />
                            </SelectTrigger>
                            <SelectContent>
                              {rates.roomTypes.map((rt) => (
                                <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Meal Basis</Label>
                          <Select value={mealBasisId} onValueChange={setMealBasisId}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Any…" />
                            </SelectTrigger>
                            <SelectContent>
                              {rates.mealBases.map((mb) => (
                                <SelectItem key={mb.id} value={mb.id}>
                                  <span className="font-mono">{mb.mealCode}</span>
                                  <span className="ml-1.5 text-muted-foreground">{mb.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Room-breakdown mode: show rates + separate room count inputs */}
                      {isRoomBreakdown ? (
                        <div className="space-y-2">
                          <Label className="text-xs">Room Allocation</Label>
                          <div className="rounded-md border divide-y">
                            {(
                              [
                                { basis: "singleRate" as const, label: "SGL", rooms: sglRooms, setRooms: setSglRooms },
                                { basis: "doubleRate" as const, label: "DBL", rooms: dblRooms, setRooms: setDblRooms },
                                { basis: "tripleRate" as const, label: "TPL", rooms: tplRooms, setRooms: setTplRooms },
                              ]
                            ).map(({ basis, label, rooms, setRooms }) => {
                              const rate = rates.rates[basis];
                              return (
                                <div key={basis} className="flex items-center gap-3 px-3 py-2">
                                  <span className="w-8 text-xs font-semibold text-muted-foreground">{label}</span>
                                  <span className="flex-1 text-xs font-mono">
                                    {rate != null
                                      ? <>{rates.currency} {rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}<span className="text-muted-foreground">/night</span></>
                                      : <span className="text-muted-foreground">—</span>
                                    }
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-7 w-16 text-right text-xs"
                                      value={rooms}
                                      onChange={(e) => setRooms(parseInt(e.target.value) || 0)}
                                      disabled={rate == null}
                                    />
                                    <span className="text-xs text-muted-foreground">rms</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Nights</Label>
                            <Input
                              type="number"
                              min={1}
                              className="h-7 w-20 text-xs"
                              value={nights}
                              onChange={(e) => setNights(parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                      ) : (
                        /* Standard mode: occupancy selector */
                        <div className="space-y-1.5">
                          <Label className="text-xs">Occupancy / Rate</Label>
                          <div className="flex gap-2">
                            {(["singleRate", "doubleRate", "tripleRate"] as const).map((basis) => {
                              const rate = rates.rates[basis];
                              const isActive = roomBasis === basis;
                              return (
                                <button
                                  key={basis}
                                  type="button"
                                  onClick={() => setRoomBasis(basis)}
                                  className={`flex-1 rounded-md border px-3 py-2 text-center text-xs transition-colors ${
                                    isActive
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border bg-background hover:bg-muted"
                                  }`}
                                >
                                  <div className="font-semibold">{ROOM_BASIS_LABELS[basis]}</div>
                                  {rate != null ? (
                                    <div className={`mt-0.5 font-mono text-[11px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                                      {rates.currency} {rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                  ) : (
                                    <div className="mt-0.5 text-[10px] text-muted-foreground">—</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!isRoomBreakdown && selectedRate != null && (
                        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                          <span className="text-xs text-muted-foreground">Selected rate</span>
                          <Badge variant="secondary" className="font-mono text-sm">
                            {rates.currency} {selectedRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              / {rates.rateBasis === "PER_PERSON" ? "pax" : "room"}
                            </span>
                          </Badge>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
                        <Button
                          size="sm"
                          disabled={
                            !hotelId || (
                              isRoomBreakdown
                                ? sglRooms + dblRooms + tplRooms === 0
                                : selectedRate == null
                            )
                          }
                          onClick={handleContractSelect}
                        >
                          Apply
                        </Button>
                      </div>
                    </>
                  )
                )}
              </>
            )}
          </TabsContent>

          {/* ── Manual Tab ── */}
          <TabsContent value="manual" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Hotel / Property Name</Label>
              <Input
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="e.g. Sofitel Cairo El Gezirah"
                className="h-8 text-xs"
              />
            </div>

            {isRoomBreakdown ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Room Allocation</Label>
                  <div className="rounded-md border divide-y">
                    {(
                      [
                        { label: "SGL", rooms: manualSglRooms, setRooms: setManualSglRooms, rate: manualSglRate, setRate: setManualSglRate },
                        { label: "DBL", rooms: manualDblRooms, setRooms: setManualDblRooms, rate: manualDblRate, setRate: setManualDblRate },
                        { label: "TPL", rooms: manualTplRooms, setRooms: setManualTplRooms, rate: manualTplRate, setRate: setManualTplRate },
                      ]
                    ).map(({ label, rooms, setRooms, rate, setRate }) => (
                      <div key={label} className="flex items-center gap-2 px-3 py-2">
                        <span className="w-8 text-xs font-semibold text-muted-foreground">{label}</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-16 text-right text-xs"
                          value={rooms}
                          onChange={(e) => setRooms(parseInt(e.target.value) || 0)}
                          placeholder="Rms"
                        />
                        <span className="text-xs text-muted-foreground">×</span>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="h-7 w-24 text-right text-xs"
                          value={rate}
                          onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                          placeholder="Rate/night"
                        />
                        <span className="text-xs text-muted-foreground">/night</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nights</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-xs"
                      value={manualNights}
                      onChange={(e) => setManualNights(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Input
                      value={manualCurrency}
                      onChange={(e) => setManualCurrency(e.target.value.toUpperCase())}
                      placeholder="USD"
                      className="h-8 text-xs"
                      maxLength={3}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Room Type</Label>
                    <Select value={manualRoomType} onValueChange={setManualRoomType}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["SGL", "DBL", "TPL", "TWIN", "SUITE", "FAMILY"].map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Meal Basis</Label>
                    <Select value={manualMeal} onValueChange={setManualMeal}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {[
                          { code: "RO", label: "Room Only" },
                          { code: "BB", label: "Bed & Breakfast" },
                          { code: "HB", label: "Half Board" },
                          { code: "FB", label: "Full Board" },
                          { code: "AI", label: "All Inclusive" },
                        ].map((m) => (
                          <SelectItem key={m.code} value={m.code}>
                            <span className="font-mono">{m.code}</span>
                            <span className="ml-1.5 text-muted-foreground text-xs">{m.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Input
                      value={manualCurrency}
                      onChange={(e) => setManualCurrency(e.target.value.toUpperCase())}
                      placeholder="USD"
                      className="h-8 text-xs"
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rate (per night)</Label>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={manualCost}
                    onChange={(e) => setManualCost(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button
                size="sm"
                disabled={!manualDesc}
                onClick={handleManualSelect}
              >
                Apply
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
