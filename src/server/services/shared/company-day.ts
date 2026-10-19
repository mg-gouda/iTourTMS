/**
 * Today's date in the company's timezone, as UTC midnight — the form DATE
 * columns compare by. A Cairo office at 01:00 is already on the next day
 * while a UTC server is not.
 */
export function companyToday(timeZone: string | null | undefined, now = new Date()): Date {
  let ymd: string;
  try {
    ymd = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    ymd = now.toISOString().slice(0, 10); // unknown zone name → UTC
  }
  return new Date(`${ymd}T00:00:00.000Z`);
}
