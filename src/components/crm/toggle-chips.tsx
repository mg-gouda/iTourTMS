"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** Pick several from a short list. Empty selection is meaningful ("any") where the caller says so. */
export function ToggleChips({
  options,
  value,
  onChange,
  emptyHint,
  label,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
  label: string;
}) {
  const t = useTranslations("crm.chips");
  const on = new Set(value);
  return (
    <div className="space-y-1.5">
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = on.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs transition-colors duration-150",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted text-foreground",
              )}
            >
              {active && <Check className="size-3" aria-hidden />}
              {o.label}
            </button>
          );
        })}
        {!options.length && <span className="text-muted-foreground text-xs">{t("nothing")}</span>}
      </div>
      {emptyHint && !value.length && options.length > 0 && <p className="text-muted-foreground text-xs">{emptyHint}</p>}
    </div>
  );
}
