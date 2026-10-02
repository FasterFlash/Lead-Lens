import type { Lead } from "./types";

// Same shape as followUpFilter.ts, but for "when did this lead come in"
// (lead.createdAt) instead of "when's the next follow-up" (nextFollowUpDate).
// Kept as its own small module rather than generalizing the two into one —
// they read from different fields and "overdue" has no meaning for a
// requested date, so sharing code would mean more branching, not less.

export type RequestedFilterMode = "none" | "today" | "last7" | "custom";

export interface RequestedFilterState {
  mode: RequestedFilterMode;
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
}

export const NO_REQUESTED_FILTER: RequestedFilterState = { mode: "none" };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function matchesRequestedFilter(lead: Lead, filter: RequestedFilterState): boolean {
  if (filter.mode === "none") return true;

  const date = lead.createdAt.slice(0, 10);

  if (filter.mode === "today") return date === todayStr();

  if (filter.mode === "last7") {
    const today = todayStr();
    return date >= addDays(today, -7) && date <= today;
  }

  if (filter.mode === "custom") {
    if (filter.from && date < filter.from) return false;
    if (filter.to && date > filter.to) return false;
    return true;
  }

  return true;
}
