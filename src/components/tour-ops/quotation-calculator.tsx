"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Calculator, Zap, Settings2, Database, Pencil, Hotel, Ship } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OPS_DESTINATION_CODES,
  OPS_GUIDE_TYPE_LABELS,
  OPS_VEHICLE_TYPE_LABELS,
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";
import {
  AccommodationPickerDialog,
  type AccommodationRoomBreakdown,
} from "@/components/tour-ops/accommodation-picker-dialog";

// ── Row types ──

interface TransportRow {
  _id: string;
  mode: "predefined" | "manual";
  description: string;
  destinationCode: string;
  routeId: string;
  vehicleType: string;
  numVehicles: number;
  numTransfers: number;
  rentEGP: number;
  tipEGP: number;
  repEGP: number;
}

interface SightseeingRow {
  _id: string;
  mode: "predefined" | "manual";
  description: string;
  destinationCode: string;
  entryId: string;
  pax: number;
  entrancePriceEGP: number;
  guideType: string;
  guidanceDays: number;
  guidancePricePerDay: number;
  policeTipEGP: number;
  parkingEGP: number;
  mealRateId: string;
  mealPax: number;
  mealPricePerPax: number;
}

interface AccommodationRow {
  _id: string;
  description: string;
  nights: number;
  currency: string;
  sglRooms: number;
  sglRate: number;
  dblRooms: number;
  dblRate: number;
  tplRooms: number;
  tplRate: number;
}

interface NileCruiseRow {
  _id: string;
  description: string;
  embarkationDay: string;
  nights: number;
  currency: string;
  sglRooms: number;
  sglRate: number;
  dblRooms: number;
  dblRate: number;
  tplRooms: number;
  tplRate: number;
}

interface MealRow {
  _id: string;
  mode: "predefined" | "manual";
  mealRateId: string;
  description: string;
  pax: number;
  pricePerPaxEGP: number;
}

interface GuidanceRow {
  _id: string;
  mode: "predefined" | "manual";
  destinationCode: string;
  guideType: string;
  description: string;
  days: number;
  pricePerDayEGP: number;
}

interface GlobalInputs {
  totalPax: number;
  roe: number;
  marginPct: number;
  vatPct: number;
  foc: number;
}

// ── Helpers ──

function fmt(v: number, d = 2) {
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function uid() { return crypto.randomUUID(); }

function mkTransportRow(): TransportRow {
  return { _id: uid(), mode: "predefined", description: "", destinationCode: "", routeId: "", vehicleType: "BUS_45", numVehicles: 1, numTransfers: 1, rentEGP: 0, tipEGP: 0, repEGP: 0 };
}
function mkSightseeingRow(totalPax: number): SightseeingRow {
  return { _id: uid(), mode: "predefined", description: "", destinationCode: "", entryId: "", pax: totalPax, entrancePriceEGP: 0, guideType: "", guidanceDays: 1, guidancePricePerDay: 0, policeTipEGP: 0, parkingEGP: 0, mealRateId: "", mealPax: 0, mealPricePerPax: 0 };
}
function mkAccommodationRow(): AccommodationRow {
  return { _id: uid(), description: "", nights: 1, currency: "USD", sglRooms: 0, sglRate: 0, dblRooms: 1, dblRate: 0, tplRooms: 0, tplRate: 0 };
}
function mkNileCruiseRow(): NileCruiseRow {
  return { _id: uid(), description: "", embarkationDay: "", nights: 4, currency: "USD", sglRooms: 0, sglRate: 0, dblRooms: 1, dblRate: 0, tplRooms: 0, tplRate: 0 };
}
function mkMealRow(totalPax: number): MealRow {
  return { _id: uid(), mode: "predefined", mealRateId: "", description: "", pax: totalPax, pricePerPaxEGP: 0 };
}
function mkGuidanceRow(): GuidanceRow {
  return { _id: uid(), mode: "predefined", destinationCode: "", guideType: "", description: "", days: 1, pricePerDayEGP: 0 };
}

// ── Mode toggle button ──
function ModeToggle({ mode, onToggle }: { mode: "predefined" | "manual"; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={mode === "predefined" ? "Switch to manual entry" : "Switch to predefined"}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[10px] transition-colors ${
        mode === "predefined"
          ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/15"
          : "border-amber-400/60 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
      }`}
    >
      {mode === "predefined" ? <Database className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
    </button>
  );
}

// ── Component ──

interface Props {
  fileId: string;
  packages: { id: string; name: string }[];
  defaultPax?: number;
  travelDate?: string;
}

export function QuotationCalculator({ fileId, packages, defaultPax = 1, travelDate }: Props) {
  const [g, setG] = useState<GlobalInputs>({ totalPax: defaultPax, roe: 50, marginPct: 0, vatPct: 0, foc: 0 });

  const [transportRows, setTransportRows] = useState<TransportRow[]>([]);
  const [sightseeingRows, setSightseeingRows] = useState<SightseeingRow[]>([]);
  const [accommodationRows, setAccommodationRows] = useState<AccommodationRow[]>([]);
  const [nileCruiseRows, setNileCruiseRows] = useState<NileCruiseRow[]>([]);
  const [mealRows, setMealRows] = useState<MealRow[]>([]);
  const [guidanceRows, setGuidanceRows] = useState<GuidanceRow[]>([]);

  const [targetPackageId, setTargetPackageId] = useState(packages[0]?.id ?? "");
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Hotel picker state
  const [hotelPicker, setHotelPicker] = useState<{ rowId: string; type: "accommodation" | "nile_cruise" } | null>(null);

  const queryOpts = { date: travelDate };
  const { data: transportDests } = trpc.tourOps.lookup.transportRoutes.useQuery(queryOpts);
  const { data: sightseeingEntries } = trpc.tourOps.lookup.sightseeingEntries.useQuery(queryOpts);
  const { data: guidanceRates } = trpc.tourOps.lookup.guidanceRates.useQuery(queryOpts);
  const { data: mealRates } = trpc.tourOps.lookup.mealRates.useQuery(queryOpts);

  const utils = trpc.useUtils();
  const generateMutation = trpc.tourOps.calculator.generateComponents.useMutation({
    onSuccess: () => { toast.success("Components added to package"); utils.tourOps.file.getById.invalidate({ id: fileId }); },
    onError: (e) => toast.error(e.message),
  });

  // ── Lookup helpers ──

  function getRoutesForDest(destCode: string) {
    return transportDests?.find((d) => d.code === destCode)?.routes ?? [];
  }
  function getRateForRouteVehicle(routeId: string, vehicleType: string) {
    if (!transportDests || !routeId || !vehicleType) return null;
    for (const dest of transportDests) {
      const route = dest.routes.find((r) => r.id === routeId);
      if (route) return route.seasons[0]?.rates.find((r) => r.vehicleType === vehicleType) ?? null;
    }
    return null;
  }
  function getEntriesForDest(destCode: string) {
    return sightseeingEntries?.filter((e) => e.destinationCode === destCode) ?? [];
  }
  function getEntrancePrice(entryId: string) {
    const entry = sightseeingEntries?.find((e) => e.id === entryId);
    return entry?.seasons[0] ? Number(entry.seasons[0].priceEGP) : 0;
  }
  function getGuidancePricePerDay(destCode: string, guideType: string) {
    if (!guidanceRates || !destCode || !guideType) return 0;
    const rate = guidanceRates.find((r) => r.destinationCode === destCode && r.guideType === guideType);
    return rate?.seasons[0] ? Number(rate.seasons[0].pricePerDay) : 0;
  }
  function getMealPricePerPax(mealRateId: string) {
    const meal = mealRates?.find((m) => m.id === mealRateId);
    return meal?.seasons[0] ? Number(meal.seasons[0].pricePerPax) : 0;
  }

  // ── Row update helpers ──

  function updateTransportRow(id: string, changes: Partial<TransportRow>) {
    setTransportRows((rows) =>
      rows.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, ...changes };
        if (changes.routeId !== undefined || changes.vehicleType !== undefined) {
          const rateRec = getRateForRouteVehicle(changes.routeId ?? r.routeId, changes.vehicleType ?? r.vehicleType);
          if (rateRec) { updated.rentEGP = Number(rateRec.rentEGP); updated.tipEGP = Number(rateRec.tipEGP); updated.repEGP = Number(rateRec.repAllowEGP); }
        }
        return updated;
      })
    );
  }
  function updateSightseeingRow(id: string, changes: Partial<SightseeingRow>) {
    setSightseeingRows((rows) =>
      rows.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, ...changes };
        if (changes.entryId !== undefined) updated.entrancePriceEGP = getEntrancePrice(changes.entryId);
        if (changes.guideType !== undefined || changes.destinationCode !== undefined) {
          updated.guidancePricePerDay = getGuidancePricePerDay(changes.destinationCode ?? r.destinationCode, changes.guideType ?? r.guideType);
        }
        if (changes.mealRateId !== undefined) updated.mealPricePerPax = getMealPricePerPax(changes.mealRateId);
        return updated;
      })
    );
  }
  function updateAccommodationRow(id: string, changes: Partial<AccommodationRow>) {
    setAccommodationRows((rows) => rows.map((r) => r._id === id ? { ...r, ...changes } : r));
  }
  function updateNileCruiseRow(id: string, changes: Partial<NileCruiseRow>) {
    setNileCruiseRows((rows) => rows.map((r) => r._id === id ? { ...r, ...changes } : r));
  }
  function updateMealRow(id: string, changes: Partial<MealRow>) {
    setMealRows((rows) =>
      rows.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, ...changes };
        if (changes.mealRateId !== undefined && changes.mealRateId) {
          updated.pricePerPaxEGP = getMealPricePerPax(changes.mealRateId);
        }
        return updated;
      })
    );
  }
  function updateGuidanceRow(id: string, changes: Partial<GuidanceRow>) {
    setGuidanceRows((rows) =>
      rows.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, ...changes };
        if (changes.guideType !== undefined || changes.destinationCode !== undefined) {
          updated.pricePerDayEGP = getGuidancePricePerDay(changes.destinationCode ?? r.destinationCode, changes.guideType ?? r.guideType);
        }
        return updated;
      })
    );
  }

  // ── Hotel picker apply ──

  function handleHotelPickerApply(data: AccommodationRoomBreakdown) {
    if (!hotelPicker) return;
    const common = {
      description: data.description,
      currency: data.currency,
      nights: data.nights,
      sglRooms: data.sglRooms, sglRate: data.sglRate,
      dblRooms: data.dblRooms, dblRate: data.dblRate,
      tplRooms: data.tplRooms, tplRate: data.tplRate,
    };
    if (hotelPicker.type === "accommodation") updateAccommodationRow(hotelPicker.rowId, common);
    else updateNileCruiseRow(hotelPicker.rowId, common);
    setHotelPicker(null);
  }

  // ── Calculations ──

  const calc = useMemo(() => {
    const { totalPax, roe } = g;

    const transportCalcs = transportRows.map((row) => {
      const totalEGP = (row.rentEGP + row.tipEGP + row.repEGP) * row.numVehicles * row.numTransfers;
      const ppEGP = totalPax > 0 ? totalEGP / totalPax : 0;
      const ppUSD = roe > 0 ? ppEGP / roe : 0;
      return { ...row, totalEGP, ppEGP, ppUSD };
    });

    const sightseeingCalcs = sightseeingRows.map((row) => {
      const entranceTotal = row.entrancePriceEGP * row.pax;
      const guidanceTotal = row.guidancePricePerDay * row.guidanceDays;
      const mealTotal = row.mealPricePerPax * row.mealPax;
      const grandTotalEGP = entranceTotal + guidanceTotal + row.policeTipEGP + row.parkingEGP + mealTotal;
      const ppEGP = totalPax > 0 ? grandTotalEGP / totalPax : 0;
      const ppUSD = roe > 0 ? ppEGP / roe : 0;
      return { ...row, entranceTotal, guidanceTotal, mealTotal, grandTotalEGP, ppEGP, ppUSD };
    });

    function calcRoomRows<T extends AccommodationRow>(rows: T[]) {
      return rows.map((row) => {
        const totalLocal = (row.sglRooms * row.sglRate + row.dblRooms * row.dblRate + row.tplRooms * row.tplRate) * row.nights;
        const totalUSD = row.currency === "EGP" ? (roe > 0 ? totalLocal / roe : 0) : totalLocal;
        const ppUSD = totalPax > 0 ? totalUSD / totalPax : 0;
        return { ...row, totalLocal, totalUSD, ppUSD };
      });
    }

    const accommodationCalcs = calcRoomRows(accommodationRows);
    const nileCruiseCalcs = calcRoomRows(nileCruiseRows) as (NileCruiseRow & { totalLocal: number; totalUSD: number; ppUSD: number })[];

    const mealCalcs = mealRows.map((row) => {
      const totalEGP = row.pricePerPaxEGP * row.pax;
      const ppEGP = totalPax > 0 ? totalEGP / totalPax : 0;
      const ppUSD = roe > 0 ? ppEGP / roe : 0;
      return { ...row, totalEGP, ppEGP, ppUSD };
    });

    const guidanceCalcs = guidanceRows.map((row) => {
      const totalEGP = row.pricePerDayEGP * row.days;
      const ppEGP = totalPax > 0 ? totalEGP / totalPax : 0;
      const ppUSD = roe > 0 ? ppEGP / roe : 0;
      return { ...row, totalEGP, ppEGP, ppUSD };
    });

    const transportPP = transportCalcs.reduce((s, r) => s + r.ppUSD, 0);
    const sightseeingPP = sightseeingCalcs.reduce((s, r) => s + r.ppUSD, 0);
    const accommodationPP = accommodationCalcs.reduce((s, r) => s + r.ppUSD, 0);
    const nileCruisePP = nileCruiseCalcs.reduce((s, r) => s + r.ppUSD, 0);
    const mealsPP = mealCalcs.reduce((s, r) => s + r.ppUSD, 0);
    const guidancePP = guidanceCalcs.reduce((s, r) => s + r.ppUSD, 0);
    const netPP = transportPP + sightseeingPP + accommodationPP + nileCruisePP + mealsPP + guidancePP;

    const { marginPct, vatPct, foc, totalPax: pax } = g;
    const sellingPP = marginPct < 100 ? netPP / (1 - marginPct / 100) : netPP;
    const sellingInclVAT = sellingPP * (1 + vatPct / 100);
    const focAdjusted = foc > 0 && pax > foc ? sellingInclVAT / (1 - foc / pax) : sellingInclVAT;

    return { transportCalcs, sightseeingCalcs, accommodationCalcs, nileCruiseCalcs, mealCalcs, guidanceCalcs, transportPP, sightseeingPP, accommodationPP, nileCruisePP, mealsPP, guidancePP, netPP, sellingPP, sellingInclVAT, focAdjusted };
  }, [transportRows, sightseeingRows, accommodationRows, nileCruiseRows, mealRows, guidanceRows, g]);

  // ── Generate Components ──

  function handleGenerate() {
    if (!targetPackageId) { toast.error("Select a target package first"); return; }

    const components: Parameters<typeof generateMutation.mutate>[0]["components"] = [];
    let sort = 0;

    for (const row of calc.transportCalcs) {
      if (row.ppUSD <= 0) continue;
      const route = getRoutesForDest(row.destinationCode).find((r) => r.id === row.routeId);
      const vehicleLabel = OPS_VEHICLE_TYPE_LABELS[row.vehicleType as keyof typeof OPS_VEHICLE_TYPE_LABELS] ?? row.vehicleType;
      const desc = row.mode === "manual"
        ? (row.description || `Transfer — ${vehicleLabel}`)
        : (route ? `${route.nameEn} — ${vehicleLabel}` : `Transfer — ${vehicleLabel}`);
      components.push({ type: "TRANSFER", description: desc, unitCost: parseFloat(row.ppUSD.toFixed(4)), qty: g.totalPax, nights: 1, pricingBasis: "PER_PERSON", notes: `${row.numVehicles}× ${vehicleLabel}, ${row.numTransfers} transfer(s). Rent EGP ${row.rentEGP}, Tip ${row.tipEGP}, Rep ${row.repEGP}.`, sortOrder: sort++ });
    }

    for (const row of calc.sightseeingCalcs) {
      if (row.ppUSD <= 0) continue;
      const entry = getEntriesForDest(row.destinationCode).find((e) => e.id === row.entryId);
      const desc = row.mode === "manual" ? (row.description || "Excursion") : (entry?.nameEn ?? "Excursion");
      components.push({ type: "EXCURSION", description: desc, unitCost: parseFloat(row.ppUSD.toFixed(4)), qty: g.totalPax, nights: 1, pricingBasis: "PER_PERSON", notes: `Entrance EGP ${row.entrancePriceEGP} × ${row.pax} pax. Guidance ${row.guidanceDays}d. Police EGP ${row.policeTipEGP}. Parking EGP ${row.parkingEGP}.`, sortOrder: sort++ });
    }

    for (const row of calc.accommodationCalcs) {
      if (row.totalUSD <= 0) continue;
      components.push({ type: "ACCOMMODATION", description: row.description || "Accommodation", unitCost: parseFloat(row.totalUSD.toFixed(4)), qty: 1, nights: 1, pricingBasis: "BULK", notes: `${row.nights} nights. SGL: ${row.sglRooms}×${row.currency} ${row.sglRate}/rm/night, DBL: ${row.dblRooms}×${row.currency} ${row.dblRate}/rm/night, TPL: ${row.tplRooms}×${row.currency} ${row.tplRate}/rm/night.`, sortOrder: sort++ });
    }

    for (const row of calc.nileCruiseCalcs) {
      if (row.totalUSD <= 0) continue;
      const embarkNote = row.embarkationDay ? ` Embarkation: ${row.embarkationDay}.` : "";
      components.push({ type: "NILE_CRUISE", description: row.description || "Nile Cruise", unitCost: parseFloat(row.totalUSD.toFixed(4)), qty: 1, nights: row.nights, pricingBasis: "BULK", notes: `${row.nights} nights.${embarkNote} SGL: ${row.sglRooms}×${row.currency} ${row.sglRate}/cabin/night, DBL: ${row.dblRooms}×${row.currency} ${row.dblRate}/cabin/night, TPL: ${row.tplRooms}×${row.currency} ${row.tplRate}/cabin/night.`, sortOrder: sort++ });
    }

    for (const row of calc.mealCalcs) {
      if (row.ppUSD <= 0) continue;
      const meal = mealRates?.find((m) => m.id === row.mealRateId);
      const desc = row.mode === "manual" ? (row.description || "Meal") : ((meal?.nameEn ?? row.description) || "Meal");
      components.push({ type: "MEAL", description: desc, unitCost: parseFloat(row.ppUSD.toFixed(4)), qty: g.totalPax, nights: 1, pricingBasis: "PER_PERSON", notes: `EGP ${row.pricePerPaxEGP}/pax × ${row.pax} pax.`, sortOrder: sort++ });
    }

    for (const row of calc.guidanceCalcs) {
      if (row.ppUSD <= 0) continue;
      const guideLabel = OPS_GUIDE_TYPE_LABELS[row.guideType as keyof typeof OPS_GUIDE_TYPE_LABELS] ?? row.guideType;
      const desc = row.mode === "manual" ? (row.description || "Guidance") : (guideLabel ? `${guideLabel} — ${row.destinationCode}` : row.description || "Guidance");
      components.push({ type: "GUIDANCE", description: desc, unitCost: parseFloat(row.ppUSD.toFixed(4)), qty: g.totalPax, nights: 1, pricingBasis: "PER_PERSON", notes: `${row.days} day(s) × EGP ${row.pricePerDayEGP}/day.`, sortOrder: sort++ });
    }

    if (components.length === 0) { toast.error("All rows have zero cost — nothing to generate"); return; }
    generateMutation.mutate({ packageId: targetPackageId, components, replaceExisting });
  }

  // ── Room card helper ──

  function RoomCells({ sglRooms, sglRate, dblRooms, dblRate, tplRooms, tplRate, currency, onUpdate }: {
    sglRooms: number; sglRate: number;
    dblRooms: number; dblRate: number;
    tplRooms: number; tplRate: number;
    currency: string;
    onUpdate: (changes: { sglRooms?: number; sglRate?: number; dblRooms?: number; dblRate?: number; tplRooms?: number; tplRate?: number }) => void;
  }) {
    return (
      <div className="flex flex-wrap gap-3">
        {(
          [
            { label: "SGL", rooms: sglRooms, rate: sglRate, rKey: "sglRooms" as const, rateKey: "sglRate" as const },
            { label: "DBL", rooms: dblRooms, rate: dblRate, rKey: "dblRooms" as const, rateKey: "dblRate" as const },
            { label: "TPL", rooms: tplRooms, rate: tplRate, rKey: "tplRooms" as const, rateKey: "tplRate" as const },
          ]
        ).map(({ label, rooms, rate, rKey, rateKey }) => (
          <div key={label} className="flex items-center gap-1.5 rounded-md border px-2 py-1">
            <span className="text-[10px] font-semibold text-muted-foreground w-7">{label}</span>
            <Input
              type="number" min={0} step={1}
              className="h-6 w-12 text-center text-xs px-1"
              value={rooms}
              onChange={(e) => onUpdate({ [rKey]: parseInt(e.target.value) || 0 })}
              title={`${label} rooms`}
            />
            <span className="text-[10px] text-muted-foreground">rms ×</span>
            <Input
              type="number" min={0} step="any"
              className="h-6 w-20 text-right text-xs px-1"
              value={rate}
              onChange={(e) => onUpdate({ [rateKey]: parseFloat(e.target.value) || 0 })}
              title={`${label} rate`}
            />
            <span className="text-[10px] text-muted-foreground">{currency}</span>
          </div>
        ))}
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-6">

      {/* ── Global Inputs ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings2 className="h-4 w-4" /> Global Inputs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {(
              [
                { key: "totalPax", label: "Total Pax", type: "int" },
                { key: "roe", label: "ROE (EGP/USD)", type: "float" },
                { key: "marginPct", label: "Margin %", type: "float" },
                { key: "vatPct", label: "VAT %", type: "float" },
                { key: "foc", label: "FOC places", type: "int" },
              ] as const
            ).map(({ key, label, type }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input type="number" min={0} step={type === "float" ? "0.01" : "1"} className="h-8 text-xs" value={g[key]}
                  onChange={(e) => setG({ ...g, [key]: type === "int" ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section A: Transportation ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Section A — Transportation</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <Database className="inline h-3 w-3 mr-0.5" /> Predefined from master data &nbsp;|&nbsp;
                <Pencil className="inline h-3 w-3 mr-0.5" /> Manual entry
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTransportRows((r) => [...r, mkTransportRow()])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transportRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No transport rows. Add a row to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="w-7 px-1 py-1.5"></th>
                    <th className="min-w-[140px] px-2 py-1.5 text-left">Route / Description</th>
                    <th className="min-w-[80px] px-2 py-1.5 text-left">Dest</th>
                    <th className="min-w-[105px] px-2 py-1.5 text-left">Vehicle</th>
                    <th className="min-w-[55px] px-2 py-1.5 text-right">Vehs</th>
                    <th className="min-w-[55px] px-2 py-1.5 text-right">Xfers</th>
                    <th className="min-w-[82px] px-2 py-1.5 text-right">Rent EGP</th>
                    <th className="min-w-[82px] px-2 py-1.5 text-right">Tip EGP</th>
                    <th className="min-w-[82px] px-2 py-1.5 text-right">Rep EGP</th>
                    <th className="min-w-[92px] px-2 py-1.5 text-right">Total EGP</th>
                    <th className="min-w-[72px] px-2 py-1.5 text-right">PP EGP</th>
                    <th className="min-w-[68px] px-2 py-1.5 text-right">PP $</th>
                    <th className="w-8 px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calc.transportCalcs.map((row) => (
                    <tr key={row._id} className="hover:bg-muted/20">
                      <td className="px-1 py-1">
                        <ModeToggle mode={row.mode} onToggle={() => updateTransportRow(row._id, { mode: row.mode === "predefined" ? "manual" : "predefined", destinationCode: "", routeId: "" })} />
                      </td>
                      {/* Route / Description cell */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Select value={row.routeId} onValueChange={(v) => updateTransportRow(row._id, { routeId: v })} disabled={!row.destinationCode}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="Route…" /></SelectTrigger>
                            <SelectContent>
                              {getRoutesForDest(row.destinationCode).map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.nameEn}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input className="h-7 text-xs" value={row.description} onChange={(e) => updateTransportRow(row._id, { description: e.target.value })} placeholder="e.g. Airport → Hotel Cairo" />
                        )}
                      </td>
                      {/* Dest cell */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Select value={row.destinationCode} onValueChange={(v) => updateTransportRow(row._id, { destinationCode: v, routeId: "" })}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="Dest…" /></SelectTrigger>
                            <SelectContent>
                              {OPS_DESTINATION_CODES.map((d) => <SelectItem key={d.code} value={d.code}>{d.code}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : <span className="text-muted-foreground text-[10px]">—</span>}
                      </td>
                      {/* Vehicle cell */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Select value={row.vehicleType} onValueChange={(v) => updateTransportRow(row._id, { vehicleType: v })}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(OPS_VEHICLE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : <span className="text-muted-foreground text-[10px]">—</span>}
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={1} className="h-7 text-right text-xs" value={row.numVehicles} onChange={(e) => updateTransportRow(row._id, { numVehicles: parseInt(e.target.value) || 1 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={1} className="h-7 text-right text-xs" value={row.numTransfers} onChange={(e) => updateTransportRow(row._id, { numTransfers: parseInt(e.target.value) || 1 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.rentEGP} onChange={(e) => updateTransportRow(row._id, { rentEGP: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.tipEGP} onChange={(e) => updateTransportRow(row._id, { tipEGP: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.repEGP} onChange={(e) => updateTransportRow(row._id, { repEGP: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.totalEGP, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.ppEGP, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmt(row.ppUSD)}</td>
                      <td className="px-2 py-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setTransportRows((rows) => rows.filter((r) => r._id !== row._id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {transportRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t text-xs font-semibold">
                      <td colSpan={11} className="px-2 pt-2 text-right text-muted-foreground">Transport PP $</td>
                      <td className="px-2 pt-2 text-right font-mono text-primary">{fmt(calc.transportPP)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section B: Sightseeing ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Section B — Sightseeing & Excursions</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <Database className="inline h-3 w-3 mr-0.5" /> Predefined attraction &nbsp;|&nbsp;
                <Pencil className="inline h-3 w-3 mr-0.5" /> Manual entry
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSightseeingRows((r) => [...r, mkSightseeingRow(g.totalPax)])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sightseeingRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No sightseeing rows. Add a row to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="w-7 px-1 py-1.5"></th>
                    <th className="min-w-[85px] px-2 py-1.5 text-left">Dest</th>
                    <th className="min-w-[155px] px-2 py-1.5 text-left">Attraction / Description</th>
                    <th className="min-w-[50px] px-2 py-1.5 text-right">Pax</th>
                    <th className="min-w-[90px] px-2 py-1.5 text-right">Entrance EGP</th>
                    <th className="min-w-[120px] px-2 py-1.5 text-left">Guide Type</th>
                    <th className="min-w-[45px] px-2 py-1.5 text-right">Days</th>
                    <th className="min-w-[90px] px-2 py-1.5 text-right">Guide/Day EGP</th>
                    <th className="min-w-[78px] px-2 py-1.5 text-right">Police EGP</th>
                    <th className="min-w-[78px] px-2 py-1.5 text-right">Parking EGP</th>
                    <th className="min-w-[140px] px-2 py-1.5 text-left">Meal</th>
                    <th className="min-w-[55px] px-2 py-1.5 text-right">Meal Pax</th>
                    <th className="min-w-[90px] px-2 py-1.5 text-right">Total EGP</th>
                    <th className="min-w-[68px] px-2 py-1.5 text-right">PP $</th>
                    <th className="w-8 px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calc.sightseeingCalcs.map((row) => (
                    <tr key={row._id} className="hover:bg-muted/20">
                      <td className="px-1 py-1">
                        <ModeToggle mode={row.mode} onToggle={() => updateSightseeingRow(row._id, { mode: row.mode === "predefined" ? "manual" : "predefined", destinationCode: "", entryId: "" })} />
                      </td>
                      {/* Dest */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Select value={row.destinationCode} onValueChange={(v) => updateSightseeingRow(row._id, { destinationCode: v, entryId: "" })}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="Dest…" /></SelectTrigger>
                            <SelectContent>
                              {OPS_DESTINATION_CODES.map((d) => <SelectItem key={d.code} value={d.code}>{d.code}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : <span className="text-muted-foreground text-[10px]">—</span>}
                      </td>
                      {/* Attraction / Description */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Select value={row.entryId} onValueChange={(v) => updateSightseeingRow(row._id, { entryId: v })} disabled={!row.destinationCode}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="Attraction…" /></SelectTrigger>
                            <SelectContent>
                              {getEntriesForDest(row.destinationCode).map((e) => <SelectItem key={e.id} value={e.id}>{e.nameEn}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input className="h-7 text-xs" value={row.description} onChange={(e) => updateSightseeingRow(row._id, { description: e.target.value })} placeholder="e.g. Giza Pyramids complex" />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={1} className="h-7 text-right text-xs" value={row.pax} onChange={(e) => updateSightseeingRow(row._id, { pax: parseInt(e.target.value) || 1 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.entrancePriceEGP} onChange={(e) => updateSightseeingRow(row._id, { entrancePriceEGP: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Select value={row.guideType || "__none__"} onValueChange={(v) => updateSightseeingRow(row._id, { guideType: v === "__none__" ? "" : v })}>
                          <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {Object.entries(OPS_GUIDE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.guidanceDays} onChange={(e) => updateSightseeingRow(row._id, { guidanceDays: parseInt(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.guidancePricePerDay} onChange={(e) => updateSightseeingRow(row._id, { guidancePricePerDay: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.policeTipEGP} onChange={(e) => updateSightseeingRow(row._id, { policeTipEGP: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.parkingEGP} onChange={(e) => updateSightseeingRow(row._id, { parkingEGP: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Select value={row.mealRateId || "__none__"} onValueChange={(v) => updateSightseeingRow(row._id, { mealRateId: v === "__none__" ? "" : v })}>
                          <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {(mealRates ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.nameEn}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.mealPax} onChange={(e) => updateSightseeingRow(row._id, { mealPax: parseInt(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.grandTotalEGP, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmt(row.ppUSD)}</td>
                      <td className="px-2 py-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setSightseeingRows((rows) => rows.filter((r) => r._id !== row._id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {sightseeingRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t text-xs font-semibold">
                      <td colSpan={13} className="px-2 pt-2 text-right text-muted-foreground">Sightseeing PP $</td>
                      <td className="px-2 pt-2 text-right font-mono text-primary">{fmt(calc.sightseeingPP)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section C: Accommodation ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Section C — Accommodation</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setAccommodationRows((r) => [...r, mkAccommodationRow()])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accommodationRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No accommodation rows. Add a row to start.</p>
          ) : (
            <div className="space-y-3">
              {calc.accommodationCalcs.map((row) => (
                <div key={row._id} className="rounded-md border p-3 space-y-2">
                  {/* Row 1: hotel name + nights + currency + delete */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button" variant="outline" size="sm"
                      className="h-7 shrink-0 gap-1 text-xs"
                      onClick={() => setHotelPicker({ rowId: row._id, type: "accommodation" })}
                    >
                      <Hotel className="h-3 w-3" /> From Contract
                    </Button>
                    <Input
                      className="h-7 flex-1 min-w-40 text-xs"
                      value={row.description}
                      onChange={(e) => updateAccommodationRow(row._id, { description: e.target.value })}
                      placeholder="Hotel name…"
                    />
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[10px] text-muted-foreground shrink-0">Nights</Label>
                      <Input type="number" min={1} className="h-7 w-14 text-xs" value={row.nights} onChange={(e) => updateAccommodationRow(row._id, { nights: parseInt(e.target.value) || 1 })} />
                    </div>
                    <Select value={row.currency} onValueChange={(v) => updateAccommodationRow(row._id, { currency: v })}>
                      <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["USD", "EGP", "EUR", "GBP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setAccommodationRows((rows) => rows.filter((r) => r._id !== row._id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {/* Row 2: room type breakdown */}
                  <RoomCells
                    sglRooms={row.sglRooms} sglRate={row.sglRate}
                    dblRooms={row.dblRooms} dblRate={row.dblRate}
                    tplRooms={row.tplRooms} tplRate={row.tplRate}
                    currency={row.currency}
                    onUpdate={(changes) => updateAccommodationRow(row._id, changes)}
                  />
                  {/* Row 3: totals */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>Total {row.currency}: <span className="font-mono font-medium text-foreground">{fmt(row.totalLocal)}</span></span>
                    {row.currency !== "USD" && <span>→ USD: <span className="font-mono font-medium text-foreground">{fmt(row.totalUSD)}</span></span>}
                    <span className="ml-auto font-medium">PP $: <span className="font-mono text-primary">{fmt(row.ppUSD)}</span></span>
                  </div>
                </div>
              ))}
              <div className="flex justify-end text-xs font-semibold text-muted-foreground pt-1">
                Accommodation PP $: <span className="ml-2 font-mono text-primary">{fmt(calc.accommodationPP)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section D: Nile Cruises ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Section D — Nile Cruises</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setNileCruiseRows((r) => [...r, mkNileCruiseRow()])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {nileCruiseRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No Nile Cruise rows. Add a row to start.</p>
          ) : (
            <div className="space-y-3">
              {calc.nileCruiseCalcs.map((row) => (
                <div key={row._id} className="rounded-md border p-3 space-y-2">
                  {/* Row 1: ship name + embarkation day + nights + currency + delete */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button" variant="outline" size="sm"
                      className="h-7 shrink-0 gap-1 text-xs"
                      onClick={() => setHotelPicker({ rowId: row._id, type: "nile_cruise" })}
                    >
                      <Ship className="h-3 w-3" /> From Contract
                    </Button>
                    <Input
                      className="h-7 flex-1 min-w-40 text-xs"
                      value={row.description}
                      onChange={(e) => updateNileCruiseRow(row._id, { description: e.target.value })}
                      placeholder="Cruise name / vessel…"
                    />
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[10px] text-muted-foreground shrink-0">Embarkation</Label>
                      <Input
                        type="date"
                        className="h-7 w-36 text-xs"
                        value={row.embarkationDay}
                        onChange={(e) => updateNileCruiseRow(row._id, { embarkationDay: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[10px] text-muted-foreground shrink-0">Nights</Label>
                      <Input type="number" min={1} className="h-7 w-14 text-xs" value={row.nights} onChange={(e) => updateNileCruiseRow(row._id, { nights: parseInt(e.target.value) || 1 })} />
                    </div>
                    <Select value={row.currency} onValueChange={(v) => updateNileCruiseRow(row._id, { currency: v })}>
                      <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["USD", "EGP", "EUR", "GBP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setNileCruiseRows((rows) => rows.filter((r) => r._id !== row._id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {/* Row 2: cabin type breakdown */}
                  <RoomCells
                    sglRooms={row.sglRooms} sglRate={row.sglRate}
                    dblRooms={row.dblRooms} dblRate={row.dblRate}
                    tplRooms={row.tplRooms} tplRate={row.tplRate}
                    currency={row.currency}
                    onUpdate={(changes) => updateNileCruiseRow(row._id, changes)}
                  />
                  {/* Row 3: totals */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>Total {row.currency}: <span className="font-mono font-medium text-foreground">{fmt(row.totalLocal)}</span></span>
                    {row.currency !== "USD" && <span>→ USD: <span className="font-mono font-medium text-foreground">{fmt(row.totalUSD)}</span></span>}
                    <span className="ml-auto font-medium">PP $: <span className="font-mono text-primary">{fmt(row.ppUSD)}</span></span>
                  </div>
                </div>
              ))}
              <div className="flex justify-end text-xs font-semibold text-muted-foreground pt-1">
                Nile Cruises PP $: <span className="ml-2 font-mono text-primary">{fmt(calc.nileCruisePP)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section E: Meals (standalone) ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Section E — Meals</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <Database className="inline h-3 w-3 mr-0.5" /> From master data &nbsp;|&nbsp;
                <Pencil className="inline h-3 w-3 mr-0.5" /> Manual entry
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMealRows((r) => [...r, mkMealRow(g.totalPax)])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mealRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No meal rows. Add a row to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="w-7 px-1 py-1.5"></th>
                    <th className="min-w-[200px] px-2 py-1.5 text-left">Meal / Description</th>
                    <th className="min-w-[55px] px-2 py-1.5 text-right">Pax</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-right">Price/Pax EGP</th>
                    <th className="min-w-[95px] px-2 py-1.5 text-right">Total EGP</th>
                    <th className="min-w-[68px] px-2 py-1.5 text-right">PP $</th>
                    <th className="w-8 px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calc.mealCalcs.map((row) => (
                    <tr key={row._id} className="hover:bg-muted/20">
                      <td className="px-1 py-1">
                        <ModeToggle mode={row.mode} onToggle={() => updateMealRow(row._id, { mode: row.mode === "predefined" ? "manual" : "predefined", mealRateId: "" })} />
                      </td>
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Select value={row.mealRateId || "__none__"} onValueChange={(v) => updateMealRow(row._id, { mealRateId: v === "__none__" ? "" : v })}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="Select meal…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Select meal…</SelectItem>
                              {(mealRates ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.nameEn}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input className="h-7 text-xs" value={row.description} onChange={(e) => updateMealRow(row._id, { description: e.target.value })} placeholder="e.g. Welcome Dinner at Nile restaurant" />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={1} className="h-7 text-right text-xs" value={row.pax} onChange={(e) => updateMealRow(row._id, { pax: parseInt(e.target.value) || 1 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} step="any" className="h-7 text-right text-xs" value={row.pricePerPaxEGP} onChange={(e) => updateMealRow(row._id, { pricePerPaxEGP: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.totalEGP, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmt(row.ppUSD)}</td>
                      <td className="px-2 py-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setMealRows((rows) => rows.filter((r) => r._id !== row._id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {mealRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t text-xs font-semibold">
                      <td colSpan={5} className="px-2 pt-2 text-right text-muted-foreground">Meals PP $</td>
                      <td className="px-2 pt-2 text-right font-mono text-primary">{fmt(calc.mealsPP)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section F: Guidance (standalone) ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Section F — Tour Guidance</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <Database className="inline h-3 w-3 mr-0.5" /> From master data &nbsp;|&nbsp;
                <Pencil className="inline h-3 w-3 mr-0.5" /> Manual entry
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setGuidanceRows((r) => [...r, mkGuidanceRow()])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {guidanceRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No guidance rows. Add a row to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="w-7 px-1 py-1.5"></th>
                    <th className="min-w-[85px] px-2 py-1.5 text-left">Dest</th>
                    <th className="min-w-[160px] px-2 py-1.5 text-left">Guide Type / Description</th>
                    <th className="min-w-[50px] px-2 py-1.5 text-right">Days</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-right">Price/Day EGP</th>
                    <th className="min-w-[95px] px-2 py-1.5 text-right">Total EGP</th>
                    <th className="min-w-[68px] px-2 py-1.5 text-right">PP $</th>
                    <th className="w-8 px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calc.guidanceCalcs.map((row) => (
                    <tr key={row._id} className="hover:bg-muted/20">
                      <td className="px-1 py-1">
                        <ModeToggle mode={row.mode} onToggle={() => updateGuidanceRow(row._id, { mode: row.mode === "predefined" ? "manual" : "predefined", destinationCode: "", guideType: "" })} />
                      </td>
                      {/* Dest */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Select value={row.destinationCode || "__none__"} onValueChange={(v) => updateGuidanceRow(row._id, { destinationCode: v === "__none__" ? "" : v, guideType: "" })}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="Dest…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {OPS_DESTINATION_CODES.map((d) => <SelectItem key={d.code} value={d.code}>{d.code}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : <span className="text-muted-foreground text-[10px]">—</span>}
                      </td>
                      {/* Guide Type / Description */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Select value={row.guideType || "__none__"} onValueChange={(v) => updateGuidanceRow(row._id, { guideType: v === "__none__" ? "" : v })}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="Guide type…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {Object.entries(OPS_GUIDE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input className="h-7 text-xs" value={row.description} onChange={(e) => updateGuidanceRow(row._id, { description: e.target.value })} placeholder="e.g. Egyptologist full tour" />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={1} className="h-7 text-right text-xs" value={row.days} onChange={(e) => updateGuidanceRow(row._id, { days: parseInt(e.target.value) || 1 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} step="any" className="h-7 text-right text-xs" value={row.pricePerDayEGP} onChange={(e) => updateGuidanceRow(row._id, { pricePerDayEGP: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.totalEGP, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmt(row.ppUSD)}</td>
                      <td className="px-2 py-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setGuidanceRows((rows) => rows.filter((r) => r._id !== row._id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {guidanceRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t text-xs font-semibold">
                      <td colSpan={6} className="px-2 pt-2 text-right text-muted-foreground">Guidance PP $</td>
                      <td className="px-2 pt-2 text-right font-mono text-primary">{fmt(calc.guidancePP)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary ── */}
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calculator className="h-4 w-4" /> Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Transport PP $", val: calc.transportPP, show: true },
                  { label: "Sightseeing PP $", val: calc.sightseeingPP, show: true },
                  { label: "Accommodation PP $", val: calc.accommodationPP, show: true },
                  { label: "Nile Cruises PP $", val: calc.nileCruisePP, show: calc.nileCruisePP > 0 },
                  { label: "Meals PP $", val: calc.mealsPP, show: calc.mealsPP > 0 },
                  { label: "Guidance PP $", val: calc.guidancePP, show: calc.guidancePP > 0 },
                ].map(({ label, val, show }) =>
                  show ? (
                    <tr key={label}>
                      <td className="py-1 text-muted-foreground">{label}</td>
                      <td className="py-1 text-right font-mono">{fmt(val)}</td>
                    </tr>
                  ) : null
                )}
                <tr className="border-t">
                  <td className="py-2 font-semibold">Net PP $</td>
                  <td className="py-2 text-right font-mono font-semibold">{fmt(calc.netPP)}</td>
                </tr>
                {g.marginPct > 0 && (
                  <tr>
                    <td className="py-1 text-muted-foreground">
                      Selling PP <Badge variant="outline" className="ml-1 text-[10px]">+{g.marginPct}%</Badge>
                    </td>
                    <td className="py-1 text-right font-mono">{fmt(calc.sellingPP)}</td>
                  </tr>
                )}
                {g.vatPct > 0 && (
                  <tr>
                    <td className="py-1 text-muted-foreground">
                      incl. VAT <Badge variant="outline" className="ml-1 text-[10px]">+{g.vatPct}%</Badge>
                    </td>
                    <td className="py-1 text-right font-mono">{fmt(calc.sellingInclVAT)}</td>
                  </tr>
                )}
                {g.foc > 0 && (
                  <tr>
                    <td className="py-1 text-muted-foreground">
                      FOC-adjusted <Badge variant="outline" className="ml-1 text-[10px]">{g.foc} free</Badge>
                    </td>
                    <td className="py-1 text-right font-mono">{fmt(calc.focAdjusted)}</td>
                  </tr>
                )}
                <tr className="border-t">
                  <td className="pt-2 font-bold text-primary">Final PP $</td>
                  <td className="pt-2 text-right font-mono text-lg font-bold text-primary">{fmt(calc.focAdjusted)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Generate Components ── */}
      {packages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" /> Generate Package Components
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Convert calculator rows into package components. Accommodation and Nile Cruise are pushed as BULK totals; all others as PP$ per person.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label className="text-xs">Target Package</Label>
                <Select value={targetPackageId} onValueChange={setTargetPackageId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select package…" /></SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="replace" checked={replaceExisting} onCheckedChange={(v) => setReplaceExisting(!!v)} />
                <Label htmlFor="replace" className="cursor-pointer text-xs">Replace existing components</Label>
              </div>
              <Button size="sm" onClick={handleGenerate} disabled={!targetPackageId || generateMutation.isPending}>
                <Zap className="mr-1 h-3.5 w-3.5" />
                {generateMutation.isPending ? "Generating…" : "Generate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {packages.length === 0 && (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Add a package to this file first to enable component generation.
        </div>
      )}

      {/* ── Hotel / Nile Cruise picker dialog ── */}
      {hotelPicker && (
        <AccommodationPickerDialog
          open={true}
          mode="room-breakdown"
          title={hotelPicker.type === "nile_cruise" ? "Select Nile Cruise" : "Select Accommodation"}
          serviceDate={travelDate}
          onClose={() => setHotelPicker(null)}
          onSelectRooms={handleHotelPickerApply}
        />
      )}
    </div>
  );
}
