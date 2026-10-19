import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a season date range as "dd MMM – dd MMM" (adds year if cross-year). */
export function formatSeasonLabel(
  startDate: string | Date,
  endDate: string | Date,
): string {
  const s = typeof startDate === "string" ? new Date(startDate) : startDate;
  const e = typeof endDate === "string" ? new Date(endDate) : endDate;
  const crossYear = s.getFullYear() !== e.getFullYear();
  const sFmt = crossYear ? format(s, "dd MMM yyyy") : format(s, "dd MMM");
  const eFmt = format(e, "dd MMM yyyy");
  return `${sFmt} – ${eFmt}`;
}

/** Today as YYYY-MM-DD in the viewer's own time zone (toISOString gives UTC: yesterday after midnight in Cairo). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
