"use client";

import { useTranslations } from "next-intl";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRM_LEAD_SOURCE_LABELS, CRM_LEAD_STATUS_LABELS } from "@/lib/constants/crm";
import { cn } from "@/lib/utils";
import type { LeadBand, ScoreReason } from "@/server/services/crm/lead-score";

const BAND: Record<LeadBand, string> = {
  hot: "bg-red-500/12 text-red-700 ring-red-500/30 dark:text-red-300",
  warm: "bg-amber-500/12 text-amber-800 ring-amber-500/30 dark:text-amber-300",
  cold: "bg-sky-500/12 text-sky-800 ring-sky-500/30 dark:text-sky-300",
};

/** Lead score 0–100 with its band; hover shows why. */
export function LeadScoreBadge({
  score,
  band,
  reasons,
  className,
}: {
  score: number;
  band: LeadBand;
  reasons?: ScoreReason[];
  className?: string;
}) {
  const t = useTranslations("crm.score");
  const label = t(band);
  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset tabular-nums",
        BAND[band],
        className,
      )}
      aria-label={t("aria", { score, band: label })}
    >
      <span className="font-mono">{score}</span>
      <span>{label}</span>
    </span>
  );
  if (!reasons?.length) return pill;

  const why = ([, code, arg]: ScoreReason) => {
    const shown =
      code === "source" ? CRM_LEAD_SOURCE_LABELS[arg as string] : code === "stage" ? CRM_LEAD_STATUS_LABELS[arg as string] : arg;
    return t(`why.${code}`, { arg: shown ?? "" });
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none">
          {pill}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-60">
        <ul className="space-y-0.5 text-xs">
          {reasons.map((r) => (
            <li key={r[1]} className="flex gap-2">
              <span className="w-7 shrink-0 text-end font-mono tabular-nums" dir="ltr">
                {r[0] > 0 ? `+${r[0]}` : r[0]}
              </span>
              <span>{why(r)}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
