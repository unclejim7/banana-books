export function monthLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Returns the calendar year/month a date falls into, in UTC to avoid timezone drift. */
export function periodFromDate(date: Date): { year: number; month: number } {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** Last day (inclusive, end-of-day UTC) of the given period. */
export function periodEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

export function periodStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}
