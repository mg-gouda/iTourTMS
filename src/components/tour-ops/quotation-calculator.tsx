"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Calculator, Zap, Settings2, Database, Pencil, Hotel, Ship, Lock, Unlock, CheckCircle2, Cloud, CloudOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Combobox } from "@/components/ui/combobox";
import {
  AccommodationPickerDialog,
  type ContractHotelData,
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
  occupancy: "SGL" | "DBL" | "TPL";
  description: string;
  contractData: ContractHotelData | null;
  arrivalDate: string;
  departureDate: string;
  nights: number;    // auto-calc from dates
  ratePRPN: number;  // per room per night
  numRooms: number;
  vatPct: number;
  currency: string;
}

interface NileCruiseRow {
  _id: string;
  occupancy: "SGL" | "DBL" | "TPL";
  description: string;
  contractData: ContractHotelData | null;
  embarkationDate: string;
  disembarkationDate: string;
  nights: number;    // auto-calc from dates
  ratePRPN: number;  // per cabin per night
  numCabins: number;
  vatPct: number;
  currency: string;
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
function calcNights(from: string, to: string): number {
  if (!from || !to) return 0;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function computeRatePRPN(occupancy: "SGL" | "DBL" | "TPL", data: ContractHotelData): number {
  const { rateBasis, sglRate, dblRate, tplRate } = data;
  if (rateBasis === "PER_ROOM") {
    return occupancy === "SGL" ? (sglRate ?? 0) : occupancy === "DBL" ? (dblRate ?? 0) : (tplRate ?? 0);
  }
  // PER_PERSON → convert to per-room cost
  if (occupancy === "SGL") return sglRate ?? 0;
  if (occupancy === "DBL") return (dblRate ?? 0) * 2;
  return (tplRate ?? 0) * 3;
}

function mkAccommodationRow(): AccommodationRow {
  return { _id: uid(), occupancy: "DBL", description: "", contractData: null, arrivalDate: "", departureDate: "", nights: 0, ratePRPN: 0, numRooms: 1, vatPct: 0, currency: "USD" };
}
function mkNileCruiseRow(): NileCruiseRow {
  return { _id: uid(), occupancy: "DBL", description: "", contractData: null, embarkationDate: "", disembarkationDate: "", nights: 0, ratePRPN: 0, numCabins: 1, vatPct: 0, currency: "USD" };
}
function mkMealRow(totalPax: number): MealRow {
  return { _id: uid(), mode: "predefined", mealRateId: "", description: "", pax: totalPax, pricePerPaxEGP: 0 };
}
function mkGuidanceRow(): GuidanceRow {
  return { _id: uid(), mode: "predefined", destinationCode: "", guideType: "", description: "", days: 1, pricePerDayEGP: 0 };
}

type CalcComponent = {
  type: "ACCOMMODATION" | "NILE_CRUISE" | "TRANSFER" | "EXCURSION" | "GUIDANCE" | "MEAL" | "MISC";
  description: string;
  unitCost: number;
  qty: number;
  nights: number;
  pricingBasis: "PER_PERSON" | "BULK";
  notes?: string;
  sortOrder: number;
};

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
  onPostSuccess?: () => void;
}

export function QuotationCalculator({ fileId, packages, defaultPax = 1, travelDate, onPostSuccess }: Props) {
  const [g, setG] = useState<GlobalInputs>({ totalPax: defaultPax, roe: 50, marginPct: 0, vatPct: 0, foc: 0 });

  const [transportRows, setTransportRows] = useState<TransportRow[]>([]);
  const [sightseeingRows, setSightseeingRows] = useState<SightseeingRow[]>([]);
  const [accommodationRows, setAccommodationRows] = useState<AccommodationRow[]>([]);
  const [nileCruiseRows, setNileCruiseRows] = useState<NileCruiseRow[]>([]);
  const [mealRows, setMealRows] = useState<MealRow[]>([]);
  const [guidanceRows, setGuidanceRows] = useState<GuidanceRow[]>([]);

  const [isPosted, setIsPosted] = useState(false);
  const [postedQuotationCode, setPostedQuotationCode] = useState<string | null>(null);

  // Hotel picker state
  const [hotelPicker, setHotelPicker] = useState<{ rowId: string; type: "accommodation" | "nile_cruise" } | null>(null);

  const queryOpts = { date: travelDate };
  const { data: transportDests } = trpc.tourOps.lookup.transportRoutes.useQuery(queryOpts);
  const { data: sightseeingEntries } = trpc.tourOps.lookup.sightseeingEntries.useQuery(queryOpts);
  const { data: guidanceRates } = trpc.tourOps.lookup.guidanceRates.useQuery(queryOpts);
  const { data: mealRates } = trpc.tourOps.lookup.mealRates.useQuery(queryOpts);

  const utils = trpc.useUtils();

  // ── Save / Load state ──
  const { data: savedState } = trpc.tourOps.calculator.getState.useQuery({ fileId });
  const saveMutation = trpc.tourOps.calculator.saveState.useMutation({
    onSuccess: () => toast.success("Calculator saved"),
    onError: (e) => toast.error(e.message),
  });
  const postMutation = trpc.tourOps.calculator.post.useMutation({
    onSuccess: (data) => {
      setIsPosted(true);
      setPostedQuotationCode(data.quotationCode);
      toast.success(`Calculation posted — Quotation ${data.quotationCode} created`);
      utils.tourOps.file.getById.invalidate({ id: fileId });
      onPostSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });
  const reopenMutation = trpc.tourOps.calculator.reopen.useMutation({
    onSuccess: () => {
      setIsPosted(false);
      toast.success("Calculator reopened for editing");
    },
    onError: (e) => toast.error(e.message),
  });

  const [stateLoaded, setStateLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether user has made any change after the initial hydration from DB
  const userChangedAfterLoad = useRef(false);

  useEffect(() => {
    if (stateLoaded || !savedState) { setStateLoaded(true); return; }
    if (savedState.posted) setIsPosted(true);
    const s = savedState.state;
    if (!s || typeof s !== "object") { setStateLoaded(true); return; }
    const st = s as Record<string, unknown>;
    if (st.g) setG(st.g as GlobalInputs);
    if (Array.isArray(st.transportRows)) setTransportRows(st.transportRows as TransportRow[]);
    if (Array.isArray(st.sightseeingRows)) setSightseeingRows(st.sightseeingRows as SightseeingRow[]);
    if (Array.isArray(st.accommodationRows)) setAccommodationRows(st.accommodationRows as AccommodationRow[]);
    if (Array.isArray(st.nileCruiseRows)) setNileCruiseRows(st.nileCruiseRows as NileCruiseRow[]);
    if (Array.isArray(st.mealRows)) setMealRows(st.mealRows as MealRow[]);
    if (Array.isArray(st.guidanceRows)) setGuidanceRows(st.guidanceRows as GuidanceRow[]);
    setStateLoaded(true);
  }, [savedState, stateLoaded]);

  const doSave = useCallback((state: Record<string, unknown>) => {
    setSaveStatus("saving");
    saveMutation.mutate(
      { fileId, state },
      {
        onSuccess: () => setSaveStatus("saved"),
        onError: () => setSaveStatus("error"),
      }
    );
  }, [fileId, saveMutation]);

  // Auto-save 1.5 s after last user change (skip the initial hydration trigger)
  useEffect(() => {
    if (!stateLoaded || isPosted) return;
    // The first firing of this effect after load is caused by the hydration
    // state updates — skip it and just mark that we're ready to track changes.
    if (!userChangedAfterLoad.current) {
      userChangedAfterLoad.current = true;
      return;
    }
    setSaveStatus("idle");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      doSave({ g, transportRows, sightseeingRows, accommodationRows, nileCruiseRows, mealRows, guidanceRows });
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, transportRows, sightseeingRows, accommodationRows, nileCruiseRows, mealRows, guidanceRows]);

  function buildComponents(): CalcComponent[] {
    const components: CalcComponent[] = [];
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
      components.push({ type: "EXCURSION", description: desc, unitCost: parseFloat(row.ppUSD.toFixed(4)), qty: g.totalPax, nights: 1, pricingBasis: "PER_PERSON", notes: `Entrance EGP ${row.entrancePriceEGP} × ${row.pax} pax.`, sortOrder: sort++ });
    }
    for (const row of calc.accommodationCalcs) {
      if (row.totalInclVAT <= 0) continue;
      const unitCostUSD = row.currency === "EGP" ? (g.roe > 0 ? row.totalInclVAT / g.roe : 0) : row.totalInclVAT;
      components.push({ type: "ACCOMMODATION", description: row.description || "Accommodation", unitCost: parseFloat(unitCostUSD.toFixed(4)), qty: 1, nights: row.nights, pricingBasis: "BULK", notes: `${row.nights}n. ${row.occupancy} × ${row.numRooms} rooms @ ${row.currency} ${row.ratePRPN}/rm/night. VAT ${row.vatPct}%.`, sortOrder: sort++ });
    }
    for (const row of calc.nileCruiseCalcs) {
      if (row.totalInclVAT <= 0) continue;
      const unitCostUSD = row.currency === "EGP" ? (g.roe > 0 ? row.totalInclVAT / g.roe : 0) : row.totalInclVAT;
      components.push({ type: "NILE_CRUISE", description: row.description || "Nile Cruise", unitCost: parseFloat(unitCostUSD.toFixed(4)), qty: 1, nights: row.nights, pricingBasis: "BULK", notes: `${row.nights}n. ${row.occupancy} × ${row.numCabins} cabins @ ${row.currency} ${row.ratePRPN}/cabin/night.`, sortOrder: sort++ });
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
    return components;
  }

  function handlePost() {
    const components = buildComponents();
    if (components.length === 0) { toast.error("All rows have zero cost — nothing to post"); return; }
    if (g.totalPax < 1) { toast.error("Total pax must be at least 1"); return; }
    postMutation.mutate({
      fileId,
      state: { g, transportRows, sightseeingRows, accommodationRows, nileCruiseRows, mealRows, guidanceRows },
      components,
      totalCostUSD: parseFloat((calc.netPP * g.totalPax).toFixed(2)),
      totalSellingUSD: parseFloat((calc.sellingInclVAT * g.totalPax).toFixed(2)),
      pax: g.totalPax,
    });
  }

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

  function handleAccommodationOccupancyChange(id: string, occupancy: "SGL" | "DBL" | "TPL") {
    setAccommodationRows((rows) => rows.map((r) => {
      if (r._id !== id) return r;
      const updated = { ...r, occupancy };
      if (r.contractData) updated.ratePRPN = computeRatePRPN(occupancy, r.contractData);
      return updated;
    }));
  }
  function handleNileCruiseOccupancyChange(id: string, occupancy: "SGL" | "DBL" | "TPL") {
    setNileCruiseRows((rows) => rows.map((r) => {
      if (r._id !== id) return r;
      const updated = { ...r, occupancy };
      if (r.contractData) updated.ratePRPN = computeRatePRPN(occupancy, r.contractData);
      return updated;
    }));
  }

  function handleAccommodationDateChange(id: string, field: "arrival" | "departure", value: string) {
    setAccommodationRows((rows) => rows.map((r) => {
      if (r._id !== id) return r;
      const arrivalDate = field === "arrival" ? value : r.arrivalDate;
      const departureDate = field === "departure" ? value : r.departureDate;
      return { ...r, arrivalDate, departureDate, nights: calcNights(arrivalDate, departureDate) };
    }));
  }
  function handleNileCruiseDateChange(id: string, field: "embarkation" | "disembarkation", value: string) {
    setNileCruiseRows((rows) => rows.map((r) => {
      if (r._id !== id) return r;
      const embarkationDate = field === "embarkation" ? value : r.embarkationDate;
      const disembarkationDate = field === "disembarkation" ? value : r.disembarkationDate;
      return { ...r, embarkationDate, disembarkationDate, nights: calcNights(embarkationDate, disembarkationDate) };
    }));
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

  function handleContractDataSelect(data: ContractHotelData) {
    if (!hotelPicker) return;
    if (hotelPicker.type === "accommodation") {
      setAccommodationRows((rows) => rows.map((r) => {
        if (r._id !== hotelPicker.rowId) return r;
        return { ...r, description: data.hotelName, currency: data.currency, contractData: data, ratePRPN: computeRatePRPN(r.occupancy, data) };
      }));
    } else {
      setNileCruiseRows((rows) => rows.map((r) => {
        if (r._id !== hotelPicker.rowId) return r;
        return { ...r, description: data.hotelName, currency: data.currency, contractData: data, ratePRPN: computeRatePRPN(r.occupancy, data) };
      }));
    }
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

    function calcAccomRows(rows: AccommodationRow[]) {
      return rows.map((row) => {
        const totalExVAT = row.ratePRPN * row.numRooms * row.nights;
        const totalInclVAT = totalExVAT * (1 + row.vatPct / 100);
        const totalPerPerson = totalPax > 0 ? totalInclVAT / totalPax : 0;
        const ppUSD = row.currency === "EGP"
          ? (roe > 0 ? totalInclVAT / roe / Math.max(1, totalPax) : 0)
          : totalPax > 0 ? totalInclVAT / totalPax : 0;
        return { ...row, totalExVAT, totalInclVAT, totalPerPerson, ppUSD };
      });
    }
    function calcCruiseRows(rows: NileCruiseRow[]) {
      return rows.map((row) => {
        const totalExVAT = row.ratePRPN * row.numCabins * row.nights;
        const totalInclVAT = totalExVAT * (1 + row.vatPct / 100);
        const totalPerPerson = totalPax > 0 ? totalInclVAT / totalPax : 0;
        const ppUSD = row.currency === "EGP"
          ? (roe > 0 ? totalInclVAT / roe / Math.max(1, totalPax) : 0)
          : totalPax > 0 ? totalInclVAT / totalPax : 0;
        return { ...row, totalExVAT, totalInclVAT, totalPerPerson, ppUSD };
      });
    }

    const accommodationCalcs = calcAccomRows(accommodationRows);
    const nileCruiseCalcs = calcCruiseRows(nileCruiseRows);

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


  // ── Render ──

  return (
    <div className="space-y-6">

      {/* ── Posted banner ── */}
      {isPosted && (
        <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Calculation posted</span>
            {postedQuotationCode && <span className="text-muted-foreground">— Quotation <span className="font-mono font-semibold">{postedQuotationCode}</span> created in Draft</span>}
          </div>
          <Button variant="outline" size="sm" onClick={() => reopenMutation.mutate({ fileId })} disabled={reopenMutation.isPending}>
            <Unlock className="mr-1.5 h-3.5 w-3.5" />
            {reopenMutation.isPending ? "Reopening…" : "Reopen for Editing"}
          </Button>
        </div>
      )}

      {/* ── Editable sections (locked when posted) ── */}
      <div className={isPosted ? "pointer-events-none select-none opacity-60" : ""}>

      {/* ── Global Inputs ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings2 className="h-4 w-4" /> Global Inputs
            </CardTitle>
            {!isPosted && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {saveStatus === "saving" && <><Cloud className="h-3.5 w-3.5 animate-pulse" /> Saving…</>}
                {saveStatus === "saved"  && <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Saved</>}
                {saveStatus === "error"  && <><CloudOff className="h-3.5 w-3.5 text-destructive" /> Save failed</>}
              </span>
            )}
          </div>
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
          <div>
            <CardTitle className="text-sm">Section A — Transportation</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <Database className="inline h-3 w-3 mr-0.5" /> Predefined from master data &nbsp;|&nbsp;
              <Pencil className="inline h-3 w-3 mr-0.5" /> Manual entry
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {transportRows.length === 0 ? (
            <div className="py-6 text-center">
              <button type="button" onClick={() => setTransportRows((r) => [...r, mkTransportRow()])} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add first row
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="w-7 px-1 py-1.5"></th>
                    <th className="min-w-[80px] px-2 py-1.5 text-left">Dest</th>
                    <th className="min-w-[140px] px-2 py-1.5 text-left">Route / Description</th>
                    <th className="min-w-[105px] px-2 py-1.5 text-left">Car Capacity</th>
                    <th className="min-w-[70px] px-2 py-1.5 text-right">No. of Cars</th>
                    <th className="min-w-[70px] px-2 py-1.5 text-right">No. of TRSF</th>
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
                      {/* Dest cell — first */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Combobox
                            options={OPS_DESTINATION_CODES.map((d) => ({ value: d.code, label: d.label }))}
                            value={row.destinationCode}
                            onValueChange={(v) => v && updateTransportRow(row._id, { destinationCode: v, routeId: "" })}
                            placeholder="Dest…"
                            className="h-7 text-xs"
                          />
                        ) : <span className="text-muted-foreground text-[10px]">—</span>}
                      </td>
                      {/* Route / Description cell — second */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Combobox
                            options={getRoutesForDest(row.destinationCode).map((r) => ({ value: r.id, label: r.nameEn }))}
                            value={row.routeId}
                            onValueChange={(v) => v && updateTransportRow(row._id, { routeId: v })}
                            placeholder="Route…"
                            disabled={!row.destinationCode}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <Input className="h-7 text-xs" value={row.description} onChange={(e) => updateTransportRow(row._id, { description: e.target.value })} placeholder="e.g. Airport → Hotel Cairo" />
                        )}
                      </td>
                      {/* Car Capacity cell */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Combobox
                            options={Object.entries(OPS_VEHICLE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                            value={row.vehicleType}
                            onValueChange={(v) => v && updateTransportRow(row._id, { vehicleType: v })}
                            className="h-7 text-xs"
                          />
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
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setTransportRows((rows) => { const i = rows.findIndex((r) => r._id === row._id); const next = [...rows]; next.splice(i + 1, 0, mkTransportRow()); return next; })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setTransportRows((rows) => rows.filter((r) => r._id !== row._id))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
          <div>
            <CardTitle className="text-sm">Section B — Sightseeing & Excursions</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <Database className="inline h-3 w-3 mr-0.5" /> Predefined attraction &nbsp;|&nbsp;
              <Pencil className="inline h-3 w-3 mr-0.5" /> Manual entry
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {sightseeingRows.length === 0 ? (
            <div className="py-6 text-center">
              <button type="button" onClick={() => setSightseeingRows((r) => [...r, mkSightseeingRow(g.totalPax)])} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add first row
              </button>
            </div>
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
                          <Combobox
                            options={OPS_DESTINATION_CODES.map((d) => ({ value: d.code, label: d.label }))}
                            value={row.destinationCode}
                            onValueChange={(v) => v && updateSightseeingRow(row._id, { destinationCode: v, entryId: "" })}
                            placeholder="Dest…"
                            className="h-7 text-xs"
                          />
                        ) : <span className="text-muted-foreground text-[10px]">—</span>}
                      </td>
                      {/* Attraction / Description */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Combobox
                            options={getEntriesForDest(row.destinationCode).map((e) => ({ value: e.id, label: e.nameEn }))}
                            value={row.entryId}
                            onValueChange={(v) => v && updateSightseeingRow(row._id, { entryId: v })}
                            placeholder="Attraction…"
                            disabled={!row.destinationCode}
                            className="h-7 text-xs"
                          />
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
                        <Combobox
                          options={[
                            { value: "", label: "None" },
                            ...Object.entries(OPS_GUIDE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
                          ]}
                          value={row.guideType || ""}
                          onValueChange={(v) => updateSightseeingRow(row._id, { guideType: v })}
                          placeholder="None"
                          className="h-7 text-xs"
                        />
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
                        <Combobox
                          options={[
                            { value: "", label: "None" },
                            ...(mealRates ?? []).map((m) => ({ value: m.id, label: m.nameEn })),
                          ]}
                          value={row.mealRateId || ""}
                          onValueChange={(v) => updateSightseeingRow(row._id, { mealRateId: v })}
                          placeholder="None"
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" min={0} className="h-7 text-right text-xs" value={row.mealPax} onChange={(e) => updateSightseeingRow(row._id, { mealPax: parseInt(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.grandTotalEGP, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmt(row.ppUSD)}</td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setSightseeingRows((rows) => { const i = rows.findIndex((r) => r._id === row._id); const next = [...rows]; next.splice(i + 1, 0, mkSightseeingRow(g.totalPax)); return next; })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setSightseeingRows((rows) => rows.filter((r) => r._id !== row._id))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
          <CardTitle className="text-sm">Section C — Accommodation</CardTitle>
        </CardHeader>
        <CardContent>
          {accommodationRows.length === 0 ? (
            <div className="py-6 text-center">
              <button type="button" onClick={() => setAccommodationRows((r) => [...r, mkAccommodationRow()])} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add first row
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="min-w-[80px] px-2 py-1.5 text-left">Occupancy</th>
                    <th className="min-w-[200px] px-2 py-1.5 text-left">Accommodation</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-left">Arrival</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-left">Departure</th>
                    <th className="min-w-[55px] px-2 py-1.5 text-right">Nights</th>
                    <th className="min-w-[130px] px-2 py-1.5 text-right">Rate PRPN</th>
                    <th className="min-w-[55px] px-2 py-1.5 text-right">Rooms</th>
                    <th className="min-w-[58px] px-2 py-1.5 text-right">VAT %</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-right">Total incl. VAT</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-right">Total excl. VAT</th>
                    <th className="min-w-[100px] px-2 py-1.5 text-right">Per Person</th>
                    <th className="w-8 px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calc.accommodationCalcs.map((row) => (
                    <tr key={row._id} className="hover:bg-muted/20">
                      {/* Col 1: Occupancy */}
                      <td className="px-2 py-1">
                        <Select value={row.occupancy} onValueChange={(v) => handleAccommodationOccupancyChange(row._id, v as "SGL" | "DBL" | "TPL")}>
                          <SelectTrigger className="h-7 w-full text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DBL">DBL</SelectItem>
                            <SelectItem value="SGL">SGL</SelectItem>
                            <SelectItem value="TPL">TPL</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Col 2: Accommodation name */}
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Pick from contract"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 transition-colors"
                            onClick={() => setHotelPicker({ rowId: row._id, type: "accommodation" })}
                          >
                            <Hotel className="h-3 w-3" />
                          </button>
                          <Input
                            className="h-7 text-xs"
                            value={row.description}
                            onChange={(e) => updateAccommodationRow(row._id, { description: e.target.value, contractData: null })}
                            placeholder="Hotel / property…"
                          />
                        </div>
                      </td>
                      {/* Col 3: Arrival Date */}
                      <td className="px-2 py-1">
                        <Input type="date" className="h-7 w-full text-xs" value={row.arrivalDate}
                          onChange={(e) => handleAccommodationDateChange(row._id, "arrival", e.target.value)} />
                      </td>
                      {/* Col 4: Departure Date */}
                      <td className="px-2 py-1">
                        <Input type="date" className="h-7 w-full text-xs" value={row.departureDate}
                          onChange={(e) => handleAccommodationDateChange(row._id, "departure", e.target.value)} />
                      </td>
                      {/* Col 5: Nights (auto-calc) */}
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{row.nights}</td>
                      {/* Col 6: Rate PRPN */}
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <Input type="number" min={0} step="any" className="h-7 flex-1 text-right text-xs"
                            value={row.ratePRPN}
                            onChange={(e) => updateAccommodationRow(row._id, { ratePRPN: parseFloat(e.target.value) || 0 })} />
                          <Select value={row.currency} onValueChange={(v) => updateAccommodationRow(row._id, { currency: v })}>
                            <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["USD", "EGP", "EUR", "GBP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      {/* Col 7: Number of rooms */}
                      <td className="px-2 py-1">
                        <Input type="number" min={0} step={1} className="h-7 w-full text-right text-xs"
                          value={row.numRooms}
                          onChange={(e) => updateAccommodationRow(row._id, { numRooms: parseInt(e.target.value) || 0 })} />
                      </td>
                      {/* Col 8: VAT % */}
                      <td className="px-2 py-1">
                        <Input type="number" min={0} step="any" className="h-7 w-full text-right text-xs"
                          value={row.vatPct}
                          onChange={(e) => updateAccommodationRow(row._id, { vatPct: parseFloat(e.target.value) || 0 })} />
                      </td>
                      {/* Col 9: Total incl. VAT */}
                      <td className="px-2 py-1.5 text-right font-mono font-medium">{fmt(row.totalInclVAT)}</td>
                      {/* Col 10: Total excl. VAT */}
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.totalExVAT)}</td>
                      {/* Col 11: Per Person */}
                      <td className="px-2 py-1.5 text-right font-mono font-semibold text-primary">{fmt(row.totalPerPerson)}</td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setAccommodationRows((rows) => { const i = rows.findIndex((r) => r._id === row._id); const next = [...rows]; next.splice(i + 1, 0, mkAccommodationRow()); return next; })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setAccommodationRows((rows) => rows.filter((r) => r._id !== row._id))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {accommodationRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t text-xs font-semibold">
                      <td colSpan={11} className="px-2 pt-2 text-right text-muted-foreground">Accommodation PP $</td>
                      <td className="px-2 pt-2 text-right font-mono text-primary">{fmt(calc.accommodationPP)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section D: Nile Cruises ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Section D — Nile Cruises</CardTitle>
        </CardHeader>
        <CardContent>
          {nileCruiseRows.length === 0 ? (
            <div className="py-6 text-center">
              <button type="button" onClick={() => setNileCruiseRows((r) => [...r, mkNileCruiseRow()])} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add first row
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="min-w-[80px] px-2 py-1.5 text-left">Occupancy</th>
                    <th className="min-w-[200px] px-2 py-1.5 text-left">Cruise / Vessel</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-left">Embarkation</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-left">Disembarkation</th>
                    <th className="min-w-[55px] px-2 py-1.5 text-right">Nights</th>
                    <th className="min-w-[130px] px-2 py-1.5 text-right">Rate PRPN</th>
                    <th className="min-w-[60px] px-2 py-1.5 text-right">Cabins</th>
                    <th className="min-w-[58px] px-2 py-1.5 text-right">VAT %</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-right">Total incl. VAT</th>
                    <th className="min-w-[110px] px-2 py-1.5 text-right">Total excl. VAT</th>
                    <th className="min-w-[100px] px-2 py-1.5 text-right">Per Person</th>
                    <th className="w-8 px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calc.nileCruiseCalcs.map((row) => (
                    <tr key={row._id} className="hover:bg-muted/20">
                      {/* Col 1: Occupancy */}
                      <td className="px-2 py-1">
                        <Select value={row.occupancy} onValueChange={(v) => handleNileCruiseOccupancyChange(row._id, v as "SGL" | "DBL" | "TPL")}>
                          <SelectTrigger className="h-7 w-full text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DBL">DBL</SelectItem>
                            <SelectItem value="SGL">SGL</SelectItem>
                            <SelectItem value="TPL">TPL</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Col 2: Cruise / vessel name */}
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Pick from contract"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 transition-colors"
                            onClick={() => setHotelPicker({ rowId: row._id, type: "nile_cruise" })}
                          >
                            <Ship className="h-3 w-3" />
                          </button>
                          <Input
                            className="h-7 text-xs"
                            value={row.description}
                            onChange={(e) => updateNileCruiseRow(row._id, { description: e.target.value, contractData: null })}
                            placeholder="Cruise name / vessel…"
                          />
                        </div>
                      </td>
                      {/* Col 3: Embarkation Date */}
                      <td className="px-2 py-1">
                        <Input type="date" className="h-7 w-full text-xs" value={row.embarkationDate}
                          onChange={(e) => handleNileCruiseDateChange(row._id, "embarkation", e.target.value)} />
                      </td>
                      {/* Col 4: Disembarkation Date */}
                      <td className="px-2 py-1">
                        <Input type="date" className="h-7 w-full text-xs" value={row.disembarkationDate}
                          onChange={(e) => handleNileCruiseDateChange(row._id, "disembarkation", e.target.value)} />
                      </td>
                      {/* Col 5: Nights (auto-calc) */}
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{row.nights}</td>
                      {/* Col 6: Rate PRPN */}
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <Input type="number" min={0} step="any" className="h-7 flex-1 text-right text-xs"
                            value={row.ratePRPN}
                            onChange={(e) => updateNileCruiseRow(row._id, { ratePRPN: parseFloat(e.target.value) || 0 })} />
                          <Select value={row.currency} onValueChange={(v) => updateNileCruiseRow(row._id, { currency: v })}>
                            <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["USD", "EGP", "EUR", "GBP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      {/* Col 7: Number of cabins */}
                      <td className="px-2 py-1">
                        <Input type="number" min={0} step={1} className="h-7 w-full text-right text-xs"
                          value={row.numCabins}
                          onChange={(e) => updateNileCruiseRow(row._id, { numCabins: parseInt(e.target.value) || 0 })} />
                      </td>
                      {/* Col 8: VAT % */}
                      <td className="px-2 py-1">
                        <Input type="number" min={0} step="any" className="h-7 w-full text-right text-xs"
                          value={row.vatPct}
                          onChange={(e) => updateNileCruiseRow(row._id, { vatPct: parseFloat(e.target.value) || 0 })} />
                      </td>
                      {/* Col 9: Total incl. VAT */}
                      <td className="px-2 py-1.5 text-right font-mono font-medium">{fmt(row.totalInclVAT)}</td>
                      {/* Col 10: Total excl. VAT */}
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.totalExVAT)}</td>
                      {/* Col 11: Per Person */}
                      <td className="px-2 py-1.5 text-right font-mono font-semibold text-primary">{fmt(row.totalPerPerson)}</td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setNileCruiseRows((rows) => { const i = rows.findIndex((r) => r._id === row._id); const next = [...rows]; next.splice(i + 1, 0, mkNileCruiseRow()); return next; })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setNileCruiseRows((rows) => rows.filter((r) => r._id !== row._id))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {nileCruiseRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t text-xs font-semibold">
                      <td colSpan={11} className="px-2 pt-2 text-right text-muted-foreground">Nile Cruises PP $</td>
                      <td className="px-2 pt-2 text-right font-mono text-primary">{fmt(calc.nileCruisePP)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section E: Meals (standalone) ── */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-sm">Section E — Meals</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <Database className="inline h-3 w-3 mr-0.5" /> From master data &nbsp;|&nbsp;
              <Pencil className="inline h-3 w-3 mr-0.5" /> Manual entry
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {mealRows.length === 0 ? (
            <div className="py-6 text-center">
              <button type="button" onClick={() => setMealRows((r) => [...r, mkMealRow(g.totalPax)])} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add first row
              </button>
            </div>
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
                          <Combobox
                            options={(mealRates ?? []).map((m) => ({ value: m.id, label: m.nameEn }))}
                            value={row.mealRateId || ""}
                            onValueChange={(v) => v && updateMealRow(row._id, { mealRateId: v })}
                            placeholder="Select meal…"
                            className="h-7 text-xs"
                          />
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
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setMealRows((rows) => { const i = rows.findIndex((r) => r._id === row._id); const next = [...rows]; next.splice(i + 1, 0, mkMealRow(g.totalPax)); return next; })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setMealRows((rows) => rows.filter((r) => r._id !== row._id))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
          <div>
            <CardTitle className="text-sm">Section F — Tour Guidance</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <Database className="inline h-3 w-3 mr-0.5" /> From master data &nbsp;|&nbsp;
              <Pencil className="inline h-3 w-3 mr-0.5" /> Manual entry
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {guidanceRows.length === 0 ? (
            <div className="py-6 text-center">
              <button type="button" onClick={() => setGuidanceRows((r) => [...r, mkGuidanceRow()])} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add first row
              </button>
            </div>
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
                          <Combobox
                            options={OPS_DESTINATION_CODES.map((d) => ({ value: d.code, label: d.label }))}
                            value={row.destinationCode || ""}
                            onValueChange={(v) => v && updateGuidanceRow(row._id, { destinationCode: v, guideType: "" })}
                            placeholder="Dest…"
                            className="h-7 text-xs"
                          />
                        ) : <span className="text-muted-foreground text-[10px]">—</span>}
                      </td>
                      {/* Guide Type / Description */}
                      <td className="px-2 py-1">
                        {row.mode === "predefined" ? (
                          <Combobox
                            options={Object.entries(OPS_GUIDE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                            value={row.guideType || ""}
                            onValueChange={(v) => v && updateGuidanceRow(row._id, { guideType: v })}
                            placeholder="Guide type…"
                            className="h-7 text-xs"
                          />
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
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setGuidanceRows((rows) => { const i = rows.findIndex((r) => r._id === row._id); const next = [...rows]; next.splice(i + 1, 0, mkGuidanceRow()); return next; })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setGuidanceRows((rows) => rows.filter((r) => r._id !== row._id))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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

      </div>{/* end locked sections */}

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

      {/* ── Post Calculation ── */}
      {!isPosted && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4" /> Post Calculation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Posting locks the calculator, creates a package from all cost rows, and generates a <strong>Draft Quotation</strong> with the final selling price. You can reopen later if revisions are needed.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Cost: <span className="font-mono font-semibold text-foreground">${fmt(calc.netPP * g.totalPax)}</span>
                &nbsp;·&nbsp;
                Selling: <span className="font-mono font-semibold text-green-600">${fmt(calc.sellingInclVAT * g.totalPax)}</span>
                &nbsp;·&nbsp;
                Final PP $: <span className="font-mono font-bold text-primary">{fmt(calc.focAdjusted)}</span>
              </div>
              <Button onClick={handlePost} disabled={postMutation.isPending} className="shrink-0">
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                {postMutation.isPending ? "Posting…" : "Post Calculation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Hotel / Nile Cruise picker dialog ── */}
      {hotelPicker && (
        <AccommodationPickerDialog
          open={true}
          title={hotelPicker.type === "nile_cruise" ? "Select Nile Cruise" : "Select Accommodation"}
          serviceDate={travelDate}
          onClose={() => setHotelPicker(null)}
          onSelectContractData={handleContractDataSelect}
        />
      )}
    </div>
  );
}
