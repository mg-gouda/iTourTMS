"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MonetaryFieldProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: number | string;
  onChange: (value: number) => void;
  currencySymbol?: string;
  decimals?: number;
}

export function MonetaryField({
  value,
  onChange,
  currencySymbol = "$",
  decimals = 2,
  className,
  ...props
}: MonetaryFieldProps) {
  const [display, setDisplay] = React.useState(() => formatValue(value, decimals));

  // Sync display when external value changes (e.g. form reset)
  React.useEffect(() => {
    setDisplay(formatValue(value, decimals));
  }, [value, decimals]);

  function formatValue(v: number | string, dec: number): string {
    const num = typeof v === "string" ? parseFloat(v) : v;
    if (isNaN(num)) return "";
    return num.toFixed(dec);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow empty, digits, single dot, optional minus
    if (raw === "" || raw === "-" || /^-?\d*\.?\d*$/.test(raw)) {
      setDisplay(raw);
    }
  }

  function handleBlur() {
    const parsed = parseFloat(display);
    if (isNaN(parsed)) {
      setDisplay(formatValue(0, decimals));
      onChange(0);
    } else {
      const rounded = Math.round(parsed * 10 ** decimals) / 10 ** decimals;
      setDisplay(formatValue(rounded, decimals));
      onChange(rounded);
    }
  }

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
        {currencySymbol}
      </span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("pl-8 text-right", className)}
      />
    </div>
  );
}
