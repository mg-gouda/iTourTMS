"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import { explainCost, type ExplainableBreakdown } from "@/lib/reservations/cost-explanation";

/**
 * The worked-out cost, in green, so an agent can check the number against the
 * contract without opening the rate sheet.
 */
export function CostExplanation({
  breakdown,
  currency,
  nights,
  note,
  className = "",
}: {
  breakdown?: ExplainableBreakdown | null;
  currency?: string;
  nights?: number;
  /** Free-text trail typed on a currency line, shown under the derived lines. */
  note?: string | null;
  className?: string;
}) {
  const lines = explainCost(breakdown, { currency, nights });
  if (lines.length === 0 && !note) return null;

  return (
    <div
      className={`rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-mono text-xs leading-relaxed text-emerald-700 dark:text-emerald-400 ${className}`}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      {note && <div className={lines.length ? "mt-1 italic" : "italic"}>{note}</div>}
    </div>
  );
}

export type RateChangeEntry = {
  id?: string;
  changedAt: string | Date;
  /** Prisma hands these over as Decimal, so accept anything number-ish. */
  oldBuyingTotal: number | string | { toString(): string };
  newBuyingTotal: number | string | { toString(): string };
  reason?: string | null;
  rebookedGuest?: string | null;
  changedBy?: { name: string | null } | null;
  /** Per-currency snapshot, stored as JSON. */
  lines?: unknown;
};

type SnapshotLine = { currencyCode: string; oldBuying: number; newBuying: number };

function snapshotLines(lines: unknown): SnapshotLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.filter(
    (l): l is SnapshotLine =>
      !!l && typeof l === "object" && "currencyCode" in l && "oldBuying" in l && "newBuying" in l,
  );
}

/**
 * Amber marker beside a cost that has been rebooked. Hover or click for the
 * old and new rates, what was gained, and who changed them.
 */
export function RateHistoryIcon({
  history,
  currency = "",
}: {
  history: RateChangeEntry[];
  currency?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!history || history.length === 0) return null;

  const money = (n: number) =>
    `${currency}${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const when = (d: string | Date) =>
    new Date(d).toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <span className="relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        className="flex items-center justify-center rounded-full p-0.5 text-amber-500 transition-colors hover:text-amber-600"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Rate change history — ${history.length} change${history.length === 1 ? "" : "s"}`}
      >
        <Info className="size-4" />
      </button>

      {open && (
        <div
          className="bg-popover absolute top-5 z-50 w-[360px] rounded-lg border border-amber-500/40 p-3 text-xs shadow-xl inset-inline-start-0"
          style={{ insetInlineStart: 0 }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <p className="mb-2 flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <Info className="size-3" />
            Rate change history ({history.length})
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto pe-1">
            {history.map((entry, i) => {
              const oldTotal = Number(entry.oldBuyingTotal.toString());
              const newTotal = Number(entry.newBuyingTotal.toString());
              const gain = oldTotal - newTotal;
              return (
                <div key={entry.id ?? i} className="rounded border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {money(oldTotal)} → {money(newTotal)}
                    </span>
                    <span
                      className={
                        gain > 0
                          ? "font-semibold text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }
                    >
                      {gain > 0 ? `gain ${money(gain)}` : "no gain"}
                    </span>
                  </div>
                  {snapshotLines(entry.lines)
                    .filter((l) => l.oldBuying !== l.newBuying)
                    .map((l) => (
                      <div key={l.currencyCode} className="text-muted-foreground">
                        {l.currencyCode} {l.oldBuying.toFixed(2)} → {l.newBuying.toFixed(2)}
                      </div>
                    ))}
                  {entry.rebookedGuest && (
                    <div className="text-muted-foreground">Rebooked: {entry.rebookedGuest}</div>
                  )}
                  {entry.reason && <div className="italic">{entry.reason}</div>}
                  <div className="text-muted-foreground mt-0.5">
                    {when(entry.changedAt)}
                    {entry.changedBy?.name ? ` · ${entry.changedBy.name}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}
