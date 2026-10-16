"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BAND = {
  hot: { label: "Hot", cls: "bg-red-500/12 text-red-700 ring-red-500/30 dark:text-red-300" },
  warm: { label: "Warm", cls: "bg-amber-500/12 text-amber-800 ring-amber-500/30 dark:text-amber-300" },
  cold: { label: "Cold", cls: "bg-sky-500/12 text-sky-800 ring-sky-500/30 dark:text-sky-300" },
} as const;

/** Lead score 0–100 with its band; hover shows why. */
export function LeadScoreBadge({
  score,
  band,
  reasons,
  className,
}: {
  score: number;
  band: keyof typeof BAND;
  reasons?: string[];
  className?: string;
}) {
  const b = BAND[band];
  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset tabular-nums",
        b.cls,
        className,
      )}
      aria-label={`Score ${score} of 100, ${b.label}`}
    >
      <span className="font-mono">{score}</span>
      <span>{b.label}</span>
    </span>
  );
  if (!reasons?.length) return pill;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {pill}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-60">
        <ul className="space-y-0.5 text-xs">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
