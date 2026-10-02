import type { Lead } from "./types";

/**
 * Effective priority score used for sorting the lead list.
 *
 * This is deliberately a THIN layer on top of the AI's own score, not a
 * second AI call. Re-running the expensive analysis every time a lead's
 * state changes would burn free-tier quota for no reason — the AI's
 * judgment on fit/intent/objections doesn't change just because time
 * passed or a call happened. What DOES need to shift is urgency, and
 * that's a cheap, local, deterministic calculation.
 *
 * Rules (in order of effect):
 * 1. A lead with no analysis yet sinks to the bottom (nothing to rank on).
 * 2. A lead whose follow-up date has arrived or passed gets a large boost —
 *    this is the "don't let it go cold" mechanic from the outcome-log
 *    feature. It should resurface near the top even if it originally
 *    scored lower than a fresh hot lead.
 * 3. A lead marked "not_interested" in its most recent outcome sinks hard —
 *    it's still visible (not deleted) but shouldn't compete for attention.
 * 4. Otherwise, sort by the AI's own score, freshest lead first as a
 *    tiebreaker.
 */
export function effectivePriority(lead: Lead): number {
  if (!lead.analysis) return -1;

  const base = lead.analysis.score;

  const lastLog = lead.contactLogs[lead.contactLogs.length - 1];
  if (lastLog?.outcome === "not_interested") {
    return base - 1000; // still sortable, always sinks below active leads
  }

  if (lead.nextFollowUpDate) {
    const due = new Date(lead.nextFollowUpDate).getTime();
    if (!Number.isNaN(due) && due <= Date.now()) {
      // Overdue follow-up: boost above a merely "hot" fresh lead so it
      // can't silently die because the rep got busy with something newer.
      return base + 500;
    }
  }

  return base;
}

export function sortLeadsByPriority(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const diff = effectivePriority(b) - effectivePriority(a);
    if (diff !== 0) return diff;
    // Tiebreaker: newer lead first.
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/** True if a lead is overdue for follow-up right now — drives a visible
 *  "overdue" badge in the UI, separate from the hot/warm/cold AI tag. */
export function isOverdue(lead: Lead): boolean {
  if (!lead.nextFollowUpDate) return false;
  const due = new Date(lead.nextFollowUpDate).getTime();
  return !Number.isNaN(due) && due <= Date.now();
}
