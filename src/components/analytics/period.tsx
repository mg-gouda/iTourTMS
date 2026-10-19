"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PRESETS = ["thisMonth", "lastMonth", "thisQuarter", "yearToDate", "last12"] as const;
export type Preset = (typeof PRESETS)[number];

/** [from, to) in UTC days for a preset, relative to today. */
export function presetRange(p: Preset, now = new Date()): { from: Date; to: Date } {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const d = (yy: number, mm: number, dd = 1) => new Date(Date.UTC(yy, mm, dd));
  const tomorrow = d(y, m, now.getUTCDate() + 1);
  switch (p) {
    case "lastMonth":
      return { from: d(y, m - 1), to: d(y, m) };
    case "thisQuarter":
      return { from: d(y, m - (m % 3)), to: d(y, m - (m % 3) + 3) };
    case "yearToDate":
      return { from: d(y, 0), to: tomorrow };
    case "last12":
      return { from: d(y - 1, m, now.getUTCDate() + 1), to: tomorrow };
    default:
      return { from: d(y, m), to: d(y, m + 1) };
  }
}

export function usePeriod(initial: Preset = "thisMonth") {
  const [preset, setPreset] = useState<Preset>(initial);
  const range = useMemo(() => presetRange(preset), [preset]);
  return { preset, setPreset, range };
}

export function PeriodSelect({ value, onChange }: { value: Preset; onChange: (p: Preset) => void }) {
  const t = useTranslations("analytics.period");
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Preset)}>
      <SelectTrigger className="h-9 w-44" aria-label={t("label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRESETS.map((p) => (
          <SelectItem key={p} value={p}>
            {t(p)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
