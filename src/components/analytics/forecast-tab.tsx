"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const WEEKS = [8, 13, 26];

/** Utilisation tint: one hue, light→dark with load; red outline when demand passes the allotment. */
function cellTone(forecast: number, capacity: number | null) {
  if (!capacity) return "";
  const u = forecast / capacity;
  if (u > 1) return "bg-primary/35 ring-2 ring-inset ring-red-600";
  if (u >= 0.85) return "bg-primary/35";
  if (u >= 0.6) return "bg-primary/20";
  if (u >= 0.3) return "bg-primary/10";
  return "";
}

export function ForecastTab() {
  const t = useTranslations("analytics.forecast");
  const locale = useLocale();
  const [weeks, setWeeks] = useState(13);
  const { data, isLoading } = trpc.analytics.occupancyForecast.useQuery({ weeks }, { placeholderData: (p) => p });
  const day = (d: Date | string) => new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" });

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const totals = data.weekStarts.map((start, i) => {
    let otb = 0, forecast = 0, capacity = 0, capKnown = true;
    for (const h of data.hotels) {
      otb += h.weeks[i].otb;
      forecast += h.weeks[i].forecast;
      if (h.weeks[i].capacity === null) capKnown = false;
      else capacity += h.weeks[i].capacity!;
    }
    return { week: day(start), otb, pickup: Math.max(0, forecast - otb), forecast, capacity: capKnown ? capacity : null };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={String(weeks)} onValueChange={(v) => setWeeks(Number(v))}>
          <SelectTrigger className="h-9 w-48" aria-label={t("weeks")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEKS.map((w) => (
              <SelectItem key={w} value={String(w)}>
                {w} {t("weeks")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {data.historySize ? t("history", { count: data.historySize }) : t("noHistory")}
        </p>
      </div>

      {!data.hotels.length ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">{t("empty")}</p>
      ) : (
        <>
          <figure className="rounded-lg border p-4">
            <figcaption className="mb-3">
              <p className="text-sm font-semibold">{t("chartTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("chartDesc")}</p>
            </figcaption>
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={totals} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={44} stroke="var(--muted-foreground)" />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [v === null ? "—" : Math.round(Number(v)), name]}
                  />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-foreground">{v}</span>} />
                  <Bar dataKey="otb" name={t("otb")} stackId="f" fill="var(--chart-otb)" stroke="var(--card)" strokeWidth={2} />
                  <Bar dataKey="pickup" name={t("pickup")} stackId="f" fill="var(--chart-pickup)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} />
                  <Line
                    dataKey="capacity"
                    name={t("capacity")}
                    type="stepAfter"
                    stroke="var(--muted-foreground)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </figure>

          <section aria-label={t("table")} className="space-y-2">
            <h2 className="text-sm font-semibold">{t("table")}</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="sticky start-0 bg-muted/50 px-3 py-2 text-start font-medium">{t("hotel")}</th>
                    {data.weekStarts.map((w) => (
                      <th key={String(w)} className="px-2 py-2 text-end font-medium whitespace-nowrap">
                        {day(w)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.hotels.map((h) => (
                    <tr key={h.hotelId} className="border-t">
                      <th scope="row" className="bg-background sticky start-0 px-3 py-2 text-start font-medium whitespace-nowrap">
                        {h.name}
                        <span className="text-muted-foreground block text-[11px] font-normal">
                          {h.capacitySource === "allotment" ? t("sourceAllotment") : h.capacitySource === "hotelRooms" ? t("sourceRooms") : t("noCapacity")}
                        </span>
                      </th>
                      {h.weeks.map((w, i) => (
                        <td
                          key={i}
                          className={cn("px-2 py-2 text-end font-mono text-xs tabular-nums whitespace-nowrap", cellTone(w.forecast, w.capacity))}
                          title={`${t("otb")}: ${w.otb} · ${t("forecast")}: ${w.forecast}${w.capacity ? ` · ${t("utilisation", { pct: Math.round((w.forecast / w.capacity) * 100) })}` : ""}`}
                        >
                          {w.forecast}
                          {w.capacity !== null && <span className="opacity-70">/{w.capacity}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
