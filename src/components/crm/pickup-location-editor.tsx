"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CRM_CURRENCY_LABELS } from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";

type Currency = "EGP" | "USD" | "EUR";

interface TierRow {
  vehicleName: string;
  minPax: number;
  maxPax: number;
  unitCost: number;
  currency: Currency;
  exchangeRate: number;
  sortOrder: number;
}

interface LocationRow {
  name: string;
  sortOrder: number;
  tiers: TierRow[];
}

function defaultTier(sortOrder = 0): TierRow {
  return { vehicleName: "", minPax: 1, maxPax: 2, unitCost: 0, currency: "EGP", exchangeRate: 0.02, sortOrder };
}

export function PickupLocationEditor({ excursionId }: { excursionId: string }) {
  const utils = trpc.useUtils();
  const { data: existing, isLoading } = trpc.crm.pickupLocation.listByExcursion.useQuery({ excursionId });
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (existing) {
      setLocations(
        existing.map((loc) => ({
          name: loc.name,
          sortOrder: loc.sortOrder,
          tiers: loc.transportTiers.map((t) => ({
            vehicleName: t.vehicleName,
            minPax: t.minPax,
            maxPax: t.maxPax,
            unitCost: Number(t.unitCost),
            currency: (t.currency as Currency) ?? "EGP",
            exchangeRate: Number(t.exchangeRate) || 1,
            sortOrder: t.sortOrder,
          })),
        })),
      );
      setDirty(false);
    }
  }, [existing]);

  const saveMutation = trpc.crm.pickupLocation.bulkSave.useMutation({
    onSuccess: () => {
      utils.crm.pickupLocation.listByExcursion.invalidate({ excursionId });
      utils.crm.excursion.getById.invalidate();
      toast.success("Pickup locations saved");
      setDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const addLocation = () => {
    setLocations((p) => [...p, { name: "", sortOrder: p.length, tiers: [defaultTier()] }]);
    setDirty(true);
  };

  const removeLocation = (li: number) => {
    setLocations((p) => p.filter((_, i) => i !== li));
    setDirty(true);
  };

  const updateLocationName = (li: number, name: string) => {
    setLocations((p) => { const a = [...p]; a[li] = { ...a[li], name }; return a; });
    setDirty(true);
  };

  const addTier = (li: number) => {
    setLocations((p) => {
      const a = [...p];
      a[li] = { ...a[li], tiers: [...a[li].tiers, defaultTier(a[li].tiers.length)] };
      return a;
    });
    setDirty(true);
  };

  const removeTier = (li: number, ti: number) => {
    setLocations((p) => {
      const a = [...p];
      a[li] = { ...a[li], tiers: a[li].tiers.filter((_, i) => i !== ti) };
      return a;
    });
    setDirty(true);
  };

  const updateTier = <K extends keyof TierRow>(li: number, ti: number, field: K, value: TierRow[K]) => {
    setLocations((p) => {
      const a = [...p];
      const tiers = [...a[li].tiers];
      tiers[ti] = { ...tiers[ti], [field]: value };
      a[li] = { ...a[li], tiers };
      return a;
    });
    setDirty(true);
  };

  const handleSave = () => {
    const invalid = locations.some((l) => !l.name.trim() || l.tiers.some((t) => !t.vehicleName.trim()));
    if (invalid) { toast.error("All locations and vehicle tiers need a name"); return; }
    saveMutation.mutate({
      excursionId,
      locations: locations.map((l, i) => ({
        name: l.name,
        sortOrder: i,
        tiers: l.tiers.map((t, j) => ({ ...t, sortOrder: j })),
      })),
    });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pickup zones and vehicle tiers used for transport cost calculation across all cost sheets.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addLocation}>
            <Plus className="mr-1 h-3 w-3" /> Add Location
          </Button>
          {dirty && (
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="mr-1 h-3 w-3" />
              {saveMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {locations.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">No pickup locations yet</p>
          <p className="text-xs text-muted-foreground">Add a location to configure transport pricing per zone.</p>
        </div>
      )}

      <div className="space-y-4">
        {locations.map((loc, li) => (
          <div key={li} className="rounded border">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
              <Input
                className="h-7 w-52 text-xs font-medium"
                placeholder="Location name (e.g. Hurghada)"
                value={loc.name}
                onChange={(e) => updateLocationName(li, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6 text-destructive"
                onClick={() => removeLocation(li)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="w-[130px] px-2 py-1.5 text-left font-medium">Vehicle</th>
                    <th className="w-[70px] px-2 py-1.5 text-right font-medium">Min Pax</th>
                    <th className="w-[70px] px-2 py-1.5 text-right font-medium">Max Pax</th>
                    <th className="w-[90px] px-2 py-1.5 text-right font-medium">Cost</th>
                    <th className="w-[65px] px-2 py-1.5 text-center font-medium">CCY</th>
                    <th className="w-[70px] px-2 py-1.5 text-right font-medium">ROE</th>
                    <th className="w-7" />
                  </tr>
                </thead>
                <tbody>
                  {loc.tiers.map((tier, ti) => (
                    <tr key={ti} className="border-b last:border-0">
                      <td className="px-1 py-1">
                        <Input
                          className="h-7 text-xs"
                          placeholder="Hi-Ace"
                          value={tier.vehicleName}
                          onChange={(e) => updateTier(li, ti, "vehicleName", e.target.value)}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          min={1}
                          className="h-7 text-xs text-right"
                          value={tier.minPax}
                          onChange={(e) => updateTier(li, ti, "minPax", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          min={1}
                          className="h-7 text-xs text-right"
                          value={tier.maxPax}
                          onChange={(e) => updateTier(li, ti, "maxPax", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-7 text-xs text-right"
                          value={tier.unitCost}
                          onChange={(e) => updateTier(li, ti, "unitCost", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          className="h-7 w-full rounded border bg-background px-1 text-xs text-center"
                          value={tier.currency}
                          onChange={(e) => updateTier(li, ti, "currency", e.target.value as Currency)}
                        >
                          {Object.keys(CRM_CURRENCY_LABELS).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          min={0}
                          step="0.0001"
                          className="h-7 text-xs text-right"
                          value={tier.exchangeRate}
                          onChange={(e) => updateTier(li, ti, "exchangeRate", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeTier(li, ti)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t bg-muted/10 px-3 py-1.5">
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => addTier(li)}>
                <Plus className="mr-1 h-3 w-3" /> Add Vehicle Tier
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
