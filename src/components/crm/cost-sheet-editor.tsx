"use client";

import { Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CRM_COST_TYPE_LABELS,
  CRM_COST_TYPE_PRICING_DEFAULTS,
  CRM_CURRENCY_LABELS,
  CRM_PRICING_TYPE_LABELS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type CostType = "GUIDE" | "REP_FEES" | "POLICE_PERMIT" | "POLICE_TIP" | "FELUCCA" | "CARRIAGE" | "TICKETS" | "MEALS" | "EXTRAS" | "DIVING_SNORKELING" | "CUSTOM";
type PricingType = "BULK" | "PER_PAX";
type Currency = "EGP" | "USD" | "EUR";

interface ComponentRow {
  costType: CostType;
  pricingType: PricingType;
  description: string;
  supplierId: string;
  qty: number;
  unitCost: number;
  currency: Currency;
  exchangeRate: number;
  sortOrder: number;
}

interface TransportTierRow {
  vehicleName: string;
  minPax: number;
  maxPax: number;
  unitCost: number;
  currency: Currency;
  exchangeRate: number;
  sortOrder: number;
}

interface PickupLocationRow {
  id?: string;
  name: string;
  sortOrder: number;
  tiers: TransportTierRow[];
}

interface Supplier { id: string; name: string }

interface ExistingComponent {
  costType: string;
  pricingType: string;
  description: string;
  supplierId: string | null;
  qty: number;
  unitCost: unknown;
  currency: string;
  exchangeRate: unknown;
  sortOrder: number;
}

interface ExistingLocation {
  id: string;
  name: string;
  sortOrder: number;
  transportTiers: {
    vehicleName: string;
    minPax: number;
    maxPax: number;
    unitCost: unknown;
    currency: string;
    exchangeRate: unknown;
    sortOrder: number;
  }[];
}

interface Props {
  sheetId: string;
  excursionId: string;
  referencePax: number;
  baseCurrency: Currency;
  existingComponents: ExistingComponent[];
  existingLocations: ExistingLocation[];
  suppliers: Supplier[];
  onSaved: () => void;
  onCancel: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toNum(v: unknown): number { return Number(v) || 0; }

function calcPerPax(row: ComponentRow, pax: number): number {
  const line = toNum(row.unitCost) * row.qty * toNum(row.exchangeRate);
  return row.pricingType === "BULK" ? (pax > 0 ? line / pax : 0) : line;
}

function transportPerPax(tier: TransportTierRow, pax: number): number {
  return pax > 0 ? (toNum(tier.unitCost) * toNum(tier.exchangeRate)) / pax : 0;
}

function findTier(tiers: TransportTierRow[], pax: number): TransportTierRow | undefined {
  return tiers.find((t) => pax >= t.minPax && pax <= t.maxPax);
}

// ── Component ──────────────────────────────────────────────────────────────

export function CostSheetEditor({
  sheetId,
  excursionId,
  referencePax: initialPax,
  baseCurrency,
  existingComponents,
  existingLocations,
  suppliers,
  onSaved,
  onCancel,
}: Props) {
  const utils = trpc.useUtils();

  const [pax, setPax] = useState(initialPax);
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [locations, setLocations] = useState<PickupLocationRow[]>([]);

  // Initialise from existing data
  useEffect(() => {
    setComponents(
      existingComponents.length > 0
        ? existingComponents.map((c) => ({
            costType: (c.costType as CostType) ?? "CUSTOM",
            pricingType: (c.pricingType as PricingType) ?? "BULK",
            description: c.description,
            supplierId: c.supplierId ?? "",
            qty: c.qty,
            unitCost: toNum(c.unitCost),
            currency: (c.currency as Currency) ?? "USD",
            exchangeRate: toNum(c.exchangeRate) || 1,
            sortOrder: c.sortOrder,
          }))
        : [defaultComponentRow()],
    );
    setLocations(
      existingLocations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        sortOrder: loc.sortOrder,
        tiers: loc.transportTiers.map((t) => ({
          vehicleName: t.vehicleName,
          minPax: t.minPax,
          maxPax: t.maxPax,
          unitCost: toNum(t.unitCost),
          currency: (t.currency as Currency) ?? "EGP",
          exchangeRate: toNum(t.exchangeRate) || 1,
          sortOrder: t.sortOrder,
        })),
      })),
    );
  }, [existingComponents, existingLocations]);

  function defaultComponentRow(): ComponentRow {
    return { costType: "GUIDE", pricingType: "BULK", description: "", supplierId: "", qty: 1, unitCost: 0, currency: "USD", exchangeRate: 1, sortOrder: 0 };
  }

  function defaultTierRow(sortOrder = 0): TransportTierRow {
    return { vehicleName: "", minPax: 1, maxPax: 2, unitCost: 0, currency: "EGP", exchangeRate: 0.02, sortOrder };
  }

  // ── Component mutations ──

  const updateComponent = useCallback(<K extends keyof ComponentRow>(idx: number, field: K, value: ComponentRow[K]) => {
    setComponents((prev) => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: value };
      if (field === "costType") {
        row.pricingType = CRM_COST_TYPE_PRICING_DEFAULTS[value as string] ?? "BULK";
      }
      rows[idx] = row;
      return rows;
    });
  }, []);

  const addComponent = () => setComponents((p) => [...p, { ...defaultComponentRow(), sortOrder: p.length }]);
  const removeComponent = (idx: number) => setComponents((p) => p.filter((_, i) => i !== idx));

  // ── Location mutations ──

  const addLocation = () =>
    setLocations((p) => [
      ...p,
      { name: "", sortOrder: p.length, tiers: [defaultTierRow()] },
    ]);

  const removeLocation = (li: number) => setLocations((p) => p.filter((_, i) => i !== li));

  const updateLocation = (li: number, name: string) =>
    setLocations((p) => { const a = [...p]; a[li] = { ...a[li], name }; return a; });

  const addTier = (li: number) =>
    setLocations((p) => {
      const a = [...p];
      a[li] = { ...a[li], tiers: [...a[li].tiers, defaultTierRow(a[li].tiers.length)] };
      return a;
    });

  const removeTier = (li: number, ti: number) =>
    setLocations((p) => {
      const a = [...p];
      a[li] = { ...a[li], tiers: a[li].tiers.filter((_, i) => i !== ti) };
      return a;
    });

  const updateTier = <K extends keyof TransportTierRow>(li: number, ti: number, field: K, value: TransportTierRow[K]) =>
    setLocations((p) => {
      const a = [...p];
      const tiers = [...a[li].tiers];
      tiers[ti] = { ...tiers[ti], [field]: value };
      a[li] = { ...a[li], tiers };
      return a;
    });

  // ── tRPC mutations ──

  const saveComponents = trpc.crm.costSheet.saveComponents.useMutation({
    onSuccess: () => utils.crm.excursion.getById.invalidate(),
  });
  const saveLocations = trpc.crm.pickupLocation.bulkSave.useMutation({
    onSuccess: () => utils.crm.excursion.getById.invalidate(),
  });
  const updateSheet = trpc.crm.costSheet.update.useMutation({});

  const handleSave = async () => {
    const invalid = components.some((c) => !c.description.trim());
    if (invalid) { toast.error("All cost rows need a description"); return; }
    const invalidTier = locations.some((l) => !l.name.trim() || l.tiers.some((t) => !t.vehicleName.trim()));
    if (invalidTier) { toast.error("All pickup locations and vehicles need a name"); return; }

    try {
      await Promise.all([
        saveComponents.mutateAsync({
          costSheetId: sheetId,
          components: components.map((c, i) => ({
            costType: c.costType,
            pricingType: c.pricingType,
            description: c.description,
            supplierId: c.supplierId,
            qty: c.qty,
            unitCost: c.unitCost,
            currency: c.currency,
            exchangeRate: c.exchangeRate,
            sortOrder: i,
          })),
        }),
        saveLocations.mutateAsync({
          excursionId,
          locations: locations.map((l, i) => ({
            name: l.name,
            sortOrder: i,
            tiers: l.tiers.map((t, j) => ({ ...t, sortOrder: j })),
          })),
        }),
        updateSheet.mutateAsync({ id: sheetId, data: { referencePax: pax } }),
      ]);
      toast.success("Cost sheet saved");
      onSaved();
    } catch {
      toast.error("Failed to save");
    }
  };

  // ── Derived totals ──

  const fixedPerPax = components.reduce((s, c) => s + calcPerPax(c, pax), 0);

  return (
    <div className="space-y-6">
      {/* Pax reference */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Reference pax count for calculation:</span>
        <Input
          type="number"
          min={1}
          className="h-7 w-20 text-xs"
          value={pax}
          onChange={(e) => setPax(Math.max(1, Number(e.target.value)))}
        />
        <span className="text-xs text-muted-foreground">Base currency: <strong>{baseCurrency}</strong></span>
      </div>

      {/* ── Fixed Costs ── */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fixed Costs</h4>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-2 py-1.5 text-left font-medium w-[120px]">Type</th>
                <th className="px-2 py-1.5 text-left font-medium">Description</th>
                <th className="px-2 py-1.5 text-left font-medium w-[130px]">Supplier</th>
                <th className="px-2 py-1.5 text-right font-medium w-[50px]">Qty</th>
                <th className="px-2 py-1.5 text-right font-medium w-[90px]">Unit Cost</th>
                <th className="px-2 py-1.5 text-center font-medium w-[70px]">CCY</th>
                <th className="px-2 py-1.5 text-right font-medium w-[70px]">Rate</th>
                <th className="px-2 py-1.5 text-center font-medium w-[90px]">Pricing</th>
                <th className="px-2 py-1.5 text-right font-medium w-[80px]">Per Pax ({baseCurrency})</th>
                <th className="w-7" />
              </tr>
            </thead>
            <tbody>
              {components.map((row, idx) => {
                const perPax = calcPerPax(row, pax);
                return (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-1 py-1">
                      <select
                        className="h-7 w-full rounded border bg-background px-1 text-xs"
                        value={row.costType}
                        onChange={(e) => updateComponent(idx, "costType", e.target.value as CostType)}
                      >
                        {Object.entries(CRM_COST_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        className="h-7 text-xs"
                        value={row.description}
                        onChange={(e) => updateComponent(idx, "description", e.target.value)}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        className="h-7 w-full rounded border bg-background px-1 text-xs"
                        value={row.supplierId}
                        onChange={(e) => updateComponent(idx, "supplierId", e.target.value)}
                      >
                        <option value="">—</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <Input type="number" min={1} className="h-7 text-xs text-right" value={row.qty}
                        onChange={(e) => updateComponent(idx, "qty", Number(e.target.value))} />
                    </td>
                    <td className="px-1 py-1">
                      <Input type="number" min={0} step="0.01" className="h-7 text-xs text-right" value={row.unitCost}
                        onChange={(e) => updateComponent(idx, "unitCost", Number(e.target.value))} />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        className="h-7 w-full rounded border bg-background px-1 text-xs text-center"
                        value={row.currency}
                        onChange={(e) => updateComponent(idx, "currency", e.target.value as Currency)}
                      >
                        {Object.keys(CRM_CURRENCY_LABELS).map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <Input type="number" min={0} step="0.0001" className="h-7 text-xs text-right" value={row.exchangeRate}
                        onChange={(e) => updateComponent(idx, "exchangeRate", Number(e.target.value))} />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        className={cn(
                          "h-7 w-full rounded border px-1 text-xs text-center font-medium",
                          row.pricingType === "BULK" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-green-300 bg-green-50 text-green-700",
                        )}
                        value={row.pricingType}
                        onChange={(e) => updateComponent(idx, "pricingType", e.target.value as PricingType)}
                      >
                        {Object.entries(CRM_PRICING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">
                      {perPax.toFixed(2)}
                    </td>
                    <td className="px-1 py-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeComponent(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40">
                <td colSpan={8} className="px-2 py-1.5 text-right text-xs font-semibold">Fixed cost per pax</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs font-bold tabular-nums">{fixedPerPax.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <Button size="sm" variant="outline" className="mt-2" onClick={addComponent}>
          <Plus className="mr-1 h-3 w-3" /> Add Cost Row
        </Button>
      </div>

      <Separator />

      {/* ── Transport Matrix ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transport Pricing by Pickup Location</h4>
          <Button size="sm" variant="outline" onClick={addLocation}>
            <Plus className="mr-1 h-3 w-3" /> Add Location
          </Button>
        </div>

        {locations.length === 0 && (
          <p className="text-xs text-muted-foreground">No pickup locations defined. Add one to configure transport pricing.</p>
        )}

        <div className="space-y-4">
          {locations.map((loc, li) => {
            const matchedTier = findTier(loc.tiers, pax);
            const tPerPax = matchedTier ? transportPerPax(matchedTier, pax) : null;

            return (
              <div key={li} className="rounded border">
                {/* Location header */}
                <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                  <Input
                    className="h-7 w-48 text-xs font-medium"
                    placeholder="Location name (e.g. Hurghada)"
                    value={loc.name}
                    onChange={(e) => updateLocation(li, e.target.value)}
                  />
                  {tPerPax !== null ? (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {matchedTier!.vehicleName} @ {pax} pax → {baseCurrency} {tPerPax.toFixed(2)}/pax
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-auto text-xs">No vehicle for {pax} pax</Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeLocation(li)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Tiers table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="px-2 py-1.5 text-left font-medium w-[130px]">Vehicle</th>
                        <th className="px-2 py-1.5 text-right font-medium w-[70px]">Min Pax</th>
                        <th className="px-2 py-1.5 text-right font-medium w-[70px]">Max Pax</th>
                        <th className="px-2 py-1.5 text-right font-medium w-[90px]">Cost</th>
                        <th className="px-2 py-1.5 text-center font-medium w-[65px]">CCY</th>
                        <th className="px-2 py-1.5 text-right font-medium w-[70px]">Rate</th>
                        <th className="px-2 py-1.5 text-right font-medium w-[80px]">Per Pax ({baseCurrency})</th>
                        <th className="w-7" />
                      </tr>
                    </thead>
                    <tbody>
                      {loc.tiers.map((tier, ti) => {
                        const isActive = pax >= tier.minPax && pax <= tier.maxPax;
                        const perPax = transportPerPax(tier, pax);
                        return (
                          <tr key={ti} className={cn("border-b last:border-0", isActive && "bg-blue-50/50")}>
                            <td className="px-1 py-1">
                              <Input className="h-7 text-xs" placeholder="Hi-Ace" value={tier.vehicleName}
                                onChange={(e) => updateTier(li, ti, "vehicleName", e.target.value)} />
                            </td>
                            <td className="px-1 py-1">
                              <Input type="number" min={1} className="h-7 text-xs text-right" value={tier.minPax}
                                onChange={(e) => updateTier(li, ti, "minPax", Number(e.target.value))} />
                            </td>
                            <td className="px-1 py-1">
                              <Input type="number" min={1} className="h-7 text-xs text-right" value={tier.maxPax}
                                onChange={(e) => updateTier(li, ti, "maxPax", Number(e.target.value))} />
                            </td>
                            <td className="px-1 py-1">
                              <Input type="number" min={0} step="0.01" className="h-7 text-xs text-right" value={tier.unitCost}
                                onChange={(e) => updateTier(li, ti, "unitCost", Number(e.target.value))} />
                            </td>
                            <td className="px-1 py-1">
                              <select className="h-7 w-full rounded border bg-background px-1 text-xs text-center"
                                value={tier.currency}
                                onChange={(e) => updateTier(li, ti, "currency", e.target.value as Currency)}>
                                {Object.keys(CRM_CURRENCY_LABELS).map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="px-1 py-1">
                              <Input type="number" min={0} step="0.0001" className="h-7 text-xs text-right" value={tier.exchangeRate}
                                onChange={(e) => updateTier(li, ti, "exchangeRate", Number(e.target.value))} />
                            </td>
                            <td className={cn("px-2 py-1 text-right font-mono tabular-nums", isActive && "font-bold text-blue-700")}>
                              {perPax.toFixed(2)}
                            </td>
                            <td className="px-1 py-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeTier(li, ti)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t bg-muted/10 px-3 py-1.5">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => addTier(li)}>
                    <Plus className="mr-1 h-3 w-3" /> Add Vehicle Tier
                  </Button>
                  {tPerPax !== null && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Total per pax: <span className="font-bold text-foreground">{baseCurrency} {(fixedPerPax + tPerPax).toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Summary ── */}
      {locations.length > 0 && (
        <>
          <Separator />
          <div className="rounded border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Cost Per Pax @ {pax} pax</p>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-0.5 text-muted-foreground">Fixed costs</td>
                  <td className="py-0.5 text-right font-mono tabular-nums">{baseCurrency} {fixedPerPax.toFixed(2)}</td>
                </tr>
                {locations.map((loc, li) => {
                  const tier = findTier(loc.tiers, pax);
                  const tpp = tier ? transportPerPax(tier, pax) : null;
                  return (
                    <tr key={li}>
                      <td className="py-0.5 text-muted-foreground">
                        Transport — {loc.name || "(unnamed)"}
                        {tier && <span className="ml-1 text-blue-600">({tier.vehicleName})</span>}
                      </td>
                      <td className="py-0.5 text-right font-mono tabular-nums">
                        {tpp !== null ? `${baseCurrency} ${tpp.toFixed(2)}` : <span className="text-destructive">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {locations.map((loc, li) => {
                  const tier = findTier(loc.tiers, pax);
                  const tpp = tier ? transportPerPax(tier, pax) : null;
                  if (tpp === null) return null;
                  return (
                    <tr key={`total-${li}`} className="border-t font-bold">
                      <td className="py-0.5">Total — {loc.name || "(unnamed)"}</td>
                      <td className="py-0.5 text-right font-mono tabular-nums">
                        {baseCurrency} {(fixedPerPax + tpp).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveComponents.isPending || saveLocations.isPending || updateSheet.isPending}
        >
          <Save className="mr-1 h-3 w-3" />
          {saveComponents.isPending || saveLocations.isPending ? "Saving…" : "Save Cost Sheet"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
