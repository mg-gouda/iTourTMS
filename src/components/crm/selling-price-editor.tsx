"use client";

import { DollarSign, Percent, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CRM_COST_CALC_BASIS_LABELS,
  CRM_MARKUP_TYPE_LABELS,
  CRM_NATIONALITY_TIER_LABELS,
  CRM_SEASON_TYPE_LABELS,
  CRM_TRIP_MODE_LABELS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";

type AgeGroup = {
  id: string;
  label: string;
  minAge: number;
  maxAge: number;
};

type CostSheet = {
  id: string;
  name: string;
  seasonType: string;
  nationalityTier: string;
  tripMode: string;
  calcBasis: string;
  totalCost: unknown;
};

type PriceRow = {
  ageGroupId: string;
  label: string;
  markupType: "PERCENTAGE" | "FIXED";
  markupValue: number;
  costPerPerson: number;
  sellingPrice: number;
  currency: string;
  active: boolean;
  sortOrder: number;
};

function computeSellingPrice(cost: number, markupType: "PERCENTAGE" | "FIXED", markupValue: number): number {
  if (markupType === "PERCENTAGE") {
    return cost * (1 + markupValue / 100);
  }
  return cost + markupValue;
}

interface SellingPriceEditorProps {
  excursionId: string;
  costSheets: CostSheet[];
  ageGroups: AgeGroup[];
}

export function SellingPriceEditor({ excursionId, costSheets, ageGroups }: SellingPriceEditorProps) {
  const utils = trpc.useUtils();
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);

  const saveMutation = trpc.crm.sellingPrice.save.useMutation({
    onSuccess: () => {
      utils.crm.sellingPrice.listByCostSheet.invalidate();
      setEditingSheetId(null);
      setPriceRows([]);
    },
  });

  const openEditor = useCallback((sheetId: string, costPerPerson: number, existing: PriceRow[]) => {
    setEditingSheetId(sheetId);
    if (existing.length > 0) {
      setPriceRows(existing);
    } else {
      // Pre-fill from age groups
      const rows: PriceRow[] = ageGroups.length > 0
        ? ageGroups.map((ag, i) => ({
            ageGroupId: ag.id,
            label: `${ag.label} (${ag.minAge}-${ag.maxAge})`,
            markupType: "PERCENTAGE" as const,
            markupValue: 30,
            costPerPerson,
            sellingPrice: computeSellingPrice(costPerPerson, "PERCENTAGE", 30),
            currency: "USD",
            active: true,
            sortOrder: i,
          }))
        : [{
            ageGroupId: "",
            label: "Adult",
            markupType: "PERCENTAGE" as const,
            markupValue: 30,
            costPerPerson,
            sellingPrice: computeSellingPrice(costPerPerson, "PERCENTAGE", 30),
            currency: "USD",
            active: true,
            sortOrder: 0,
          }];
      setPriceRows(rows);
    }
  }, [ageGroups]);

  const updateRow = useCallback((index: number, field: keyof PriceRow, value: string | number | boolean) => {
    setPriceRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (row as any)[field] = value;
      // Recompute selling price
      if (field === "markupType" || field === "markupValue" || field === "costPerPerson") {
        row.sellingPrice = computeSellingPrice(row.costPerPerson, row.markupType, row.markupValue);
      }
      updated[index] = row;
      return updated;
    });
  }, []);

  const addRow = useCallback(() => {
    setPriceRows((prev) => [
      ...prev,
      {
        ageGroupId: "",
        label: "",
        markupType: "PERCENTAGE",
        markupValue: 30,
        costPerPerson: 0,
        sellingPrice: 0,
        currency: "USD",
        active: true,
        sortOrder: prev.length,
      },
    ]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setPriceRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (costSheets.length === 0) {
    return <p className="text-sm text-muted-foreground">Add cost sheets first before setting selling prices.</p>;
  }

  return (
    <div className="space-y-4">
      {costSheets.map((sheet) => {
        const isEditing = editingSheetId === sheet.id;
        const costPerPerson = Number(sheet.totalCost ?? 0);

        return (
          <CostSheetPriceCard
            key={sheet.id}
            sheet={sheet}
            costPerPerson={costPerPerson}
            isEditing={isEditing}
            priceRows={priceRows}
            ageGroups={ageGroups}
            savePending={saveMutation.isPending}
            onEdit={(existing) => openEditor(sheet.id, costPerPerson, existing)}
            onUpdateRow={updateRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onSave={() => {
              saveMutation.mutate({
                costSheetId: sheet.id,
                prices: priceRows.map((r, i) => ({ ...r, sortOrder: i })),
              });
            }}
            onCancel={() => { setEditingSheetId(null); setPriceRows([]); }}
          />
        );
      })}
    </div>
  );
}

interface CostSheetPriceCardProps {
  sheet: CostSheet;
  costPerPerson: number;
  isEditing: boolean;
  priceRows: PriceRow[];
  ageGroups: AgeGroup[];
  savePending: boolean;
  onEdit: (existing: PriceRow[]) => void;
  onUpdateRow: (index: number, field: keyof PriceRow, value: string | number | boolean) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

function CostSheetPriceCard({
  sheet,
  costPerPerson,
  isEditing,
  priceRows,
  ageGroups,
  savePending,
  onEdit,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onSave,
  onCancel,
}: CostSheetPriceCardProps) {
  const { data: existingPrices } = trpc.crm.sellingPrice.listByCostSheet.useQuery(
    { costSheetId: sheet.id }
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">{sheet.name}</CardTitle>
            <div className="mt-1 flex gap-2">
              <Badge variant="outline">{CRM_SEASON_TYPE_LABELS[sheet.seasonType]}</Badge>
              <Badge variant="outline">{CRM_TRIP_MODE_LABELS[sheet.tripMode]}</Badge>
              <Badge variant="outline">{CRM_COST_CALC_BASIS_LABELS[sheet.calcBasis]}</Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Cost/person</p>
            <p className="font-mono font-bold">${costPerPerson.toFixed(2)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isEditing ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-1.5 text-left text-xs font-medium">Label</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium w-[120px]">Markup Type</th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium w-[90px]">Markup</th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium w-[90px]">Cost</th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium w-[100px]">Sell Price</th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium w-[70px]">Margin</th>
                    <th className="w-[36px]" />
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((row, idx) => {
                    const margin = row.sellingPrice > 0
                      ? ((row.sellingPrice - row.costPerPerson) / row.sellingPrice * 100)
                      : 0;
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-1 py-1">
                          <Input
                            className="h-8 text-xs"
                            value={row.label}
                            onChange={(e) => onUpdateRow(idx, "label", e.target.value)}
                            placeholder="e.g. Adult"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            className="h-8 w-full rounded border bg-background px-1 text-xs"
                            value={row.markupType}
                            onChange={(e) => onUpdateRow(idx, "markupType", e.target.value)}
                          >
                            {Object.entries(CRM_MARKUP_TYPE_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-xs text-right"
                            value={row.markupValue}
                            onChange={(e) => onUpdateRow(idx, "markupValue", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-xs text-right"
                            value={row.costPerPerson}
                            onChange={(e) => onUpdateRow(idx, "costPerPerson", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-xs font-semibold text-green-600">
                          ${row.sellingPrice.toFixed(2)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-xs text-muted-foreground">
                          {margin.toFixed(1)}%
                        </td>
                        <td className="px-1 py-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => onRemoveRow(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="px-2 py-1.5 text-right text-xs font-semibold">Average Selling Price</td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold text-green-600">
                      ${priceRows.length > 0
                        ? (priceRows.reduce((s, r) => s + r.sellingPrice, 0) / priceRows.length).toFixed(2)
                        : "0.00"}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onAddRow}>
                <Plus className="mr-1 h-3 w-3" /> Add Row
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={savePending}
              >
                <Save className="mr-1 h-3 w-3" />
                {savePending ? "Saving..." : "Save Prices"}
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
          </div>
        ) : existingPrices && existingPrices.length > 0 ? (
          <div className="space-y-2">
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">Category</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">Markup</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium">Cost</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium">Sell Price</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {existingPrices.map((p) => {
                    const cost = Number(p.costPerPerson);
                    const sell = Number(p.sellingPrice);
                    const margin = sell > 0 ? ((sell - cost) / sell * 100) : 0;
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium">{p.label}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant="outline" className="text-xs">
                            {p.markupType === "PERCENTAGE" ? (
                              <><Percent className="mr-1 h-3 w-3" />{Number(p.markupValue)}%</>
                            ) : (
                              <><DollarSign className="mr-1 h-3 w-3" />{Number(p.markupValue)}</>
                            )}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">${cost.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold text-green-600">${sell.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{margin.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(existingPrices!.map((p) => ({
                ageGroupId: p.ageGroupId ?? "",
                label: p.label,
                markupType: p.markupType as "PERCENTAGE" | "FIXED",
                markupValue: Number(p.markupValue),
                costPerPerson: Number(p.costPerPerson),
                sellingPrice: Number(p.sellingPrice),
                currency: p.currency,
                active: p.active,
                sortOrder: p.sortOrder,
              })))}
            >
              Edit Prices
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit([])}
          >
            <DollarSign className="mr-1 h-3 w-3" /> Set Selling Prices
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
