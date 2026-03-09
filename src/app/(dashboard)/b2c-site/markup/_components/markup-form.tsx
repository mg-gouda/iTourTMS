"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

// ── Types ────────────────────────────────────────────────

interface TierForm {
  key: string; // client-side key for React list
  dateFrom: string;
  dateTo: string;
  markupType: string;
  value: string;
}

interface RuleForm {
  name: string;
  markupType: string;
  value: string;
  destinationId: string;
  hotelId: string;
  priority: string;
  active: boolean;
  tiers: TierForm[];
}

const MARKUP_TYPES = [
  { value: "PERCENTAGE", label: "Percentage (%)" },
  { value: "FIXED_PER_NIGHT", label: "Fixed per Night" },
  { value: "FIXED_PER_BOOKING", label: "Fixed per Booking" },
];

function newTier(): TierForm {
  return {
    key: crypto.randomUUID(),
    dateFrom: "",
    dateTo: "",
    markupType: "PERCENTAGE",
    value: "",
  };
}

// ── Component ────────────────────────────────────────────

export function MarkupForm({
  initialData,
  ruleId,
}: {
  initialData?: RuleForm;
  ruleId?: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const defaultForm: RuleForm = {
    name: "",
    markupType: "PERCENTAGE",
    value: "",
    destinationId: "",
    hotelId: "",
    priority: "0",
    active: true,
    tiers: [],
  };

  const [form, setForm] = useState<RuleForm>(initialData ?? defaultForm);

  // Fetch destinations and hotels for scope dropdowns
  const { data: destinations } = trpc.contracting.destination.list.useQuery();
  const { data: hotels } = trpc.contracting.hotel.list.useQuery();

  const createMutation = trpc.b2cSite.b2cMarkup.create.useMutation({
    onSuccess: () => {
      toast.success("Markup rule created");
      utils.b2cSite.b2cMarkup.list.invalidate();
      router.push("/b2c-site/markup");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.b2cSite.b2cMarkup.update.useMutation({
    onSuccess: () => {
      toast.success("Markup rule updated");
      utils.b2cSite.b2cMarkup.list.invalidate();
      router.push("/b2c-site/markup");
    },
    onError: (err) => toast.error(err.message),
  });

  const set = <K extends keyof RuleForm>(k: K, v: RuleForm[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const setTier = (index: number, key: keyof TierForm, value: string) => {
    setForm((prev) => {
      const tiers = [...prev.tiers];
      tiers[index] = { ...tiers[index], [key]: value };
      return { ...prev, tiers };
    });
  };

  const addTier = () => set("tiers", [...form.tiers, newTier()]);
  const removeTier = (index: number) =>
    set("tiers", form.tiers.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const value = parseFloat(form.value);
    if (isNaN(value) || value < 0) {
      toast.error("Default value must be a valid number >= 0");
      return;
    }

    const tiers = form.tiers.map((t, i) => {
      const v = parseFloat(t.value);
      if (isNaN(v) || v < 0) throw new Error(`Tier ${i + 1}: value must be >= 0`);
      if (!t.dateFrom || !t.dateTo) throw new Error(`Tier ${i + 1}: dates required`);
      return {
        dateFrom: t.dateFrom,
        dateTo: t.dateTo,
        markupType: t.markupType as "PERCENTAGE" | "FIXED_PER_NIGHT" | "FIXED_PER_BOOKING",
        value: v,
        sortOrder: i,
      };
    });

    const payload = {
      name: form.name.trim(),
      markupType: form.markupType as "PERCENTAGE" | "FIXED_PER_NIGHT" | "FIXED_PER_BOOKING",
      value,
      destinationId: form.destinationId || null,
      hotelId: form.hotelId || null,
      priority: parseInt(form.priority) || 0,
      active: form.active,
      tiers,
    };

    try {
      if (ruleId) {
        updateMutation.mutate({ id: ruleId, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {ruleId ? "Edit Markup Rule" : "New Markup Rule"}
          </h1>
          <p className="text-muted-foreground">
            {ruleId
              ? "Update markup rule and period tiers"
              : "Create a new B2C markup rule"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/b2c-site/markup")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Global 15% Markup"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Markup Type</Label>
            <Select value={form.markupType} onValueChange={(v) => set("markupType", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKUP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default Value *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder="15"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => set("active", v)}
            />
            <Label>Active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Scope */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope</CardTitle>
          <CardDescription>
            Leave both empty for a global rule. Hotel scope takes priority over
            destination scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Destination (optional)</Label>
            <Select
              value={form.destinationId || "_none"}
              onValueChange={(v) => set("destinationId", v === "_none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All destinations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">All destinations</SelectItem>
                {destinations?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Hotel (optional)</Label>
            <Select
              value={form.hotelId || "_none"}
              onValueChange={(v) => set("hotelId", v === "_none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All hotels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">All hotels</SelectItem>
                {hotels?.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Period Tiers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Period Tiers</CardTitle>
              <CardDescription>
                Override markup for specific date ranges. If no tier matches, the
                default value is used.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addTier}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {form.tiers.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No period tiers. The default markup value will be used for all dates.
            </p>
          ) : (
            <div className="space-y-3">
              {form.tiers.map((tier, i) => (
                <div
                  key={tier.key}
                  className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-5"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={tier.dateFrom}
                      onChange={(e) => setTier(i, "dateFrom", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={tier.dateTo}
                      onChange={(e) => setTier(i, "dateTo", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={tier.markupType}
                      onValueChange={(v) => setTier(i, "markupType", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKUP_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tier.value}
                      onChange={(e) => setTier(i, "value", e.target.value)}
                      placeholder="20"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    onClick={() => removeTier(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
