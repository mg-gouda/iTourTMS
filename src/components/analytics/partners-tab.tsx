"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { useTranslations } from "next-intl";

import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/server/trpc/router";

import { PeriodSelect, usePeriod } from "./period";

type Row = inferRouterOutputs<AppRouter>["analytics"]["partnerPerformance"]["partners"][number];

const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(0)}%`);
const num = (title: string, key: keyof Row, fmt: (r: Row) => React.ReactNode): ColumnDef<Row> => ({
  id: key,
  accessorFn: (r) => (r[key] as number | null) ?? -Infinity,
  header: ({ column }) => <DataTableColumnHeader column={column} title={title} />,
  cell: ({ row }) => <span className="font-mono tabular-nums">{fmt(row.original)}</span>,
});

/** Per tour operator, for stays arriving in the period. */
export function PartnersTab() {
  const t = useTranslations("analytics");
  const tp = useTranslations("analytics.partners");
  const { preset, setPreset, range } = usePeriod("yearToDate");
  const { data, isLoading } = trpc.analytics.partnerPerformance.useQuery(range, { placeholderData: (p) => p });

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={tp("partner")} />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    num(tp("bookings"), "liveBookings", (r) => r.liveBookings),
    num(tp("roomNights"), "roomNights", (r) => r.roomNights),
    num(tp("revenue"), "revenue", (r) => formatCurrency(r.revenue, 0)),
    num(tp("margin"), "margin", (r) => formatCurrency(r.margin, 0)),
    num(tp("marginPct"), "marginPct", (r) => pct(r.marginPct)),
    num(tp("cancelPct"), "cancelPct", (r) => (
      <span className={cn(r.cancelPct >= 20 && "text-red-700 dark:text-red-400")}>{pct(r.cancelPct)}</span>
    )),
    num(tp("noShowPct"), "noShowPct", (r) => pct(r.noShowPct)),
    num(tp("lead"), "avgLeadDays", (r) => r.avgLeadDays ?? "—"),
    num(tp("growth"), "growthPct", (r) =>
      r.growthPct === null ? (
        "—"
      ) : (
        <span dir="ltr" className={r.growthPct >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
          {r.growthPct > 0 ? "+" : ""}
          {r.growthPct.toFixed(0)}%
        </span>
      ),
    ),
    num(tp("credit"), "creditUsed", (r) =>
      r.creditLimit > 0 ? (
        <span className={cn(r.creditUsed / r.creditLimit >= 0.9 && "text-red-700 dark:text-red-400")}>
          {Math.round((r.creditUsed / r.creditLimit) * 100)}%
        </span>
      ) : (
        "—"
      ),
    ),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PeriodSelect value={preset} onChange={setPreset} />
          <span className="text-muted-foreground text-xs">{tp("stays")}</span>
        </div>
        {data && <p className="text-muted-foreground text-xs">{t("currencyNote", { code: data.baseCode })}</p>}
      </div>
      {data?.missingRates.length ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          {t("missingRates", { codes: data.missingRates.join(", ") })}
        </p>
      ) : null}
      {isLoading || !data ? (
        <Skeleton className="h-72 w-full" />
      ) : !data.partners.length ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">{tp("empty")}</p>
      ) : (
        <DataTable columns={columns} data={data.partners} searchKey="name" searchPlaceholder={tp("partner")} />
      )}
    </div>
  );
}
