import type { Lead } from "./types";
import { isOverdue } from "./ranking";

// Deliberately NOT a drag-slider: with a handful of leads and sparse,
// discrete follow-up dates, a slider adds interaction complexity (two
// handles, a scale, edge-case clamping) for no real gain over named presets
// + an explicit date range — and it's much easier to get subtly wrong when
// it can't be visually tested before shipping. Presets cover the common
// cases (today, overdue, this week) in one click; the custom range covers
// literally anything else via two plain date inputs.

export type FollowUpFilterMode = "none" | "today" | "overdue" | "next7" | "custom";

export interface FollowUpFilterState {
  mode: FollowUpFilterMode;
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
}

export const NO_FOLLOW_UP_FILTER: FollowUpFilterState = { mode: "none" };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function matchesFollowUpFilter(lead: Lead, filter: FollowUpFilterState): boolean {
  if (filter.mode === "none") return true;

  if (filter.mode === "overdue") return isOverdue(lead);

  const date = lead.nextFollowUpDate;
  if (!date) return false; // every other mode requires a follow-up date to exist

  if (filter.mode === "today") return date === todayStr();

  if (filter.mode === "next7") {
    const today = todayStr();
    return date >= today && date <= addDays(today, 7);
  }

  if (filter.mode === "custom") {
    if (filter.from && date < filter.from) return false;
    if (filter.to && date > filter.to) return false;
    return true;
  }

  return true;
}
