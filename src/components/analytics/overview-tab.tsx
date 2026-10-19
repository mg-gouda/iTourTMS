"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { PeriodSelect, usePeriod } from "./period";

const whole = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

function Delta({ value, previous }: { value: number; previous?: number }) {
  const t = useTranslations("analytics");
  if (previous === undefined) return null;
  if (!previous) return <span className="text-muted-foreground text-xs">{value ? t("noPrevious") : "—"}</span>;
  const pct = ((value - previous) / Math.abs(previous)) * 100;
  const flat = Math.abs(pct) < 0.5;
  const Icon = flat ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        flat ? "text-muted-foreground" : pct > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
      )}
      title={t("vsPrevious")}
      dir="ltr"
    >
      <Icon className="size-3.5" aria-hidden />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
}

/** Headline numbers per module for the chosen period, each against the period before. */
export function OverviewTab() {
  const t = useTranslations("analytics");
  const { preset, setPreset, range } = usePeriod();
  const { data, isLoading } = trpc.analytics.overview.useQuery(range, { placeholderData: (p) => p });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelect value={preset} onChange={setPreset} />
        {data && <p className="text-muted-foreground text-xs">{t("currencyNote", { code: data.baseCode })}</p>}
      </div>

      {data?.missingRates.length ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          {t("missingRates", { codes: data.missingRates.join(", ") })}
        </p>
      ) : null}

      {isLoading || !data ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="divide-y rounded-lg border">
          {data.sections.map((s) => (
            <section key={s.key} className="grid gap-4 p-4 md:grid-cols-[12rem_1fr]" aria-labelledby={`sec-${s.key}`}>
              <h2 id={`sec-${s.key}`} className="text-sm font-semibold">
                {t(`sections.${s.key}` as "sections.hotels")}
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
                {s.metrics.map((m) => (
                  <div key={m.key} className="min-w-0">
                    <dt className="text-muted-foreground text-xs">{t(`metrics.${m.key}` as "metrics.bookings")}</dt>
                    <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-lg font-semibold tabular-nums">
                        {m.kind === "money" ? formatCurrency(m.value, 0) : whole(m.value)}
                      </span>
                      <Delta value={m.value} previous={m.previous} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
