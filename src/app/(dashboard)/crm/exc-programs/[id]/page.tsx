"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  OPERATING_DAYS,
  hasDay,
  toggleDay,
  formatOperatingDays,
} from "@/lib/constants/crm";
import {
  programPlanUpdateSchema,
  programPlanSaveItemsSchema,
} from "@/lib/validations/crm";
import { trpc } from "@/lib/trpc";

type UpdateForm = z.infer<typeof programPlanUpdateSchema>;

interface ItemRow {
  excursionId: string;
  sellingPriceId: string;
  minToOperate: number;
  operatingDays: number;
  sortOrder: number;
  notes: string;
}

function DayPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {OPERATING_DAYS.map((d) => {
        const active = hasDay(value, d.bit);
        return (
          <button
            key={d.label}
            type="button"
            onClick={() => onChange(toggleDay(value, d.bit))}
            className={[
              "rounded px-2 py-0.5 text-xs font-medium border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-input hover:border-primary",
            ].join(" ")}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

interface ExcursionOption { id: string; code: string; name: string; active: boolean; maxPax: number | null }

function PlanItemRow({
  item,
  excursions,
  onUpdate,
  onRemove,
}: {
  item: ItemRow;
  excursions: ExcursionOption[];
  onUpdate: <K extends keyof ItemRow>(field: K, value: ItemRow[K]) => void;
  onRemove: () => void;
}) {
  const { data: pricing } = trpc.crm.booking.getExcursionPricing.useQuery(
    { excursionId: item.excursionId },
    { enabled: !!item.excursionId },
  );

  const excInfo = excursions.find((e) => e.id === item.excursionId);
  const sellingPrices = pricing?.costSheets.flatMap((cs) =>
    cs.sellingPrices.map((sp) => ({ ...sp, sheetName: cs.name })),
  ) ?? [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Excursion</label>
              <select
                className="h-8 w-full rounded border bg-background px-2 text-sm"
                value={item.excursionId}
                onChange={(e) => onUpdate("excursionId", e.target.value)}
              >
                <option value="">— Select excursion —</option>
                {excursions.filter((e) => e.active).map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rate</label>
              <select
                className="h-8 w-full rounded border bg-background px-2 text-sm"
                value={item.sellingPriceId}
                onChange={(e) => onUpdate("sellingPriceId", e.target.value)}
                disabled={!item.excursionId || sellingPrices.length === 0}
              >
                <option value="">— Select rate —</option>
                {sellingPrices.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.sheetName} — {sp.label}: {sp.currency} {Number(sp.sellingPrice).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="mt-5 h-7 w-7 text-destructive shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Min to Operate</label>
            <Input
              type="number"
              min={1}
              className="h-8 text-sm"
              value={item.minToOperate}
              onChange={(e) => onUpdate("minToOperate", Math.max(1, Number(e.target.value)))}
            />
            {excInfo?.maxPax && (
              <p className="text-xs text-muted-foreground">Max capacity: {excInfo.maxPax}</p>
            )}
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Operating Days — <span className="text-foreground">{formatOperatingDays(item.operatingDays)}</span>
            </label>
            <DayPicker
              value={item.operatingDays}
              onChange={(v) => onUpdate("operatingDays", v)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
          <Input
            className="h-8 text-sm"
            placeholder="e.g. Minimum 8 pax required for private mode"
            value={item.notes}
            onChange={(e) => onUpdate("notes", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExcProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: plan, isLoading } = trpc.crm.programPlan.getById.useQuery({ id });
  const { data: markets } = trpc.crm.programPlan.listMarkets.useQuery();
  const { data: excursions } = trpc.crm.excursion.list.useQuery();

  // ── Info form ──
  const infoForm = useForm<UpdateForm>({
    resolver: zodResolver(programPlanUpdateSchema),
    defaultValues: { name: "", description: "", marketId: "", active: true },
  });

  useEffect(() => {
    if (plan) {
      infoForm.reset({
        name: plan.name,
        description: plan.description ?? "",
        marketId: plan.marketId ?? "",
        active: plan.active,
      });
      setItems(
        plan.items.map((it) => ({
          excursionId: it.excursionId,
          sellingPriceId: it.sellingPriceId ?? "",
          minToOperate: it.minToOperate,
          operatingDays: it.operatingDays,
          sortOrder: it.sortOrder,
          notes: it.notes ?? "",
        })),
      );
    }
  }, [plan]);

  const updateMutation = trpc.crm.programPlan.update.useMutation({
    onSuccess: () => {
      utils.crm.programPlan.getById.invalidate({ id });
      utils.crm.programPlan.list.invalidate();
      toast.success("Program updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.crm.programPlan.delete.useMutation({
    onSuccess: () => {
      utils.crm.programPlan.list.invalidate();
      router.push("/crm/exc-programs");
    },
  });

  // ── Items editor ──
  const [items, setItems] = useState<ItemRow[]>([]);
  const [itemsDirty, setItemsDirty] = useState(false);

  const saveItemsMutation = trpc.crm.programPlan.saveItems.useMutation({
    onSuccess: () => {
      utils.crm.programPlan.getById.invalidate({ id });
      toast.success("Schedule saved");
      setItemsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  function addItem() {
    setItems((prev) => [
      ...prev,
      { excursionId: "", sellingPriceId: "", minToOperate: 1, operatingDays: 127, sortOrder: prev.length, notes: "" },
    ]);
    setItemsDirty(true);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setItemsDirty(true);
  }

  function updateItem<K extends keyof ItemRow>(idx: number, field: K, value: ItemRow[K]) {
    setItems((prev) => {
      const rows = [...prev];
      rows[idx] = { ...rows[idx], [field]: value };
      // Reset selling price when excursion changes
      if (field === "excursionId") rows[idx].sellingPriceId = "";
      return rows;
    });
    setItemsDirty(true);
  }

  function handleSaveItems() {
    const invalid = items.some((it) => !it.excursionId);
    if (invalid) { toast.error("All rows must have an excursion selected"); return; }
    saveItemsMutation.mutate({
      programPlanId: id,
      items: items.map((it, i) => ({
        ...it,
        sellingPriceId: it.sellingPriceId || undefined,
        notes: it.notes || undefined,
        sortOrder: i,
      })),
    });
  }


  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!plan) return <p className="p-6 text-sm text-muted-foreground">Program not found</p>;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/exc-programs"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{plan.name}</h1>
              <Badge variant={plan.active ? "default" : "secondary"}>
                {plan.active ? "Active" : "Inactive"}
              </Badge>
              {plan.market && <Badge variant="outline">{plan.market.name}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {plan.items.length} excursion{plan.items.length !== 1 ? "s" : ""} in this program
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { if (confirm("Delete this program?")) deleteMutation.mutate({ id }); }}
        >
          Delete Program
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Left: Info form ── */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Program Info</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...infoForm}>
              <form
                onSubmit={infoForm.handleSubmit((v) => updateMutation.mutate({ id, data: v }))}
                className="space-y-4"
              >
                <FormField control={infoForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={infoForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={3} {...field} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={infoForm.control} name="marketId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All markets" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">All markets</SelectItem>
                        {markets?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={infoForm.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel>Active</FormLabel>
                  </FormItem>
                )} />

                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Info"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── Right: Schedule editor ── */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Excursion Schedule</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Excursion
              </Button>
              {itemsDirty && (
                <Button size="sm" onClick={handleSaveItems} disabled={saveItemsMutation.isPending}>
                  {saveItemsMutation.isPending ? "Saving…" : "Save Schedule"}
                </Button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">No excursions added yet</p>
              <p className="text-xs text-muted-foreground">
                Add excursions and configure their rates, minimum to operate, and operating days.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Excursion
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <PlanItemRow
                  key={idx}
                  item={item}
                  excursions={excursions ?? []}
                  onUpdate={(field, value) => updateItem(idx, field, value)}
                  onRemove={() => removeItem(idx)}
                />
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add Excursion
                </Button>
                {itemsDirty && (
                  <Button size="sm" onClick={handleSaveItems} disabled={saveItemsMutation.isPending}>
                    {saveItemsMutation.isPending ? "Saving…" : "Save Schedule"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
