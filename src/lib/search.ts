import type { Lead, LeadStatus, PriorityTag } from "./types";
import { isOverdue } from "./ranking";

// Universal search — one box, no mode switch. Each space-separated word in
// the query is checked on its own: if it's a known keyword (a priority tag,
// a status, "overdue"/"followup") it filters on that structured field;
// otherwise it falls back to a substring match across every text field on
// the lead, including the AI's own signals/summary. Multiple words are AND'd
// together, so "hot vijaywada", "claimed overdue", "cold vastu" all work as
// you'd expect without the user ever picking a filter type explicitly.
//
// Pure client-side array filtering over data already in memory — no AI
// call, no network round-trip, instant as you type.

const STATUS_KEYWORDS: Record<string, LeadStatus> = {
  open: "unclaimed",
  unclaimed: "unclaimed",
  claimed: "claimed",
  contacted: "contacted",
  closed: "closed",
};

const PRIORITY_KEYWORDS: PriorityTag[] = ["hot", "warm", "cold"];

function tokenMatches(lead: Lead, token: string): boolean {
  const t = token.toLowerCase();

  if (t in STATUS_KEYWORDS) {
    return lead.status === STATUS_KEYWORDS[t];
  }
  if ((PRIORITY_KEYWORDS as string[]).includes(t)) {
    return lead.analysis?.priorityTag === t;
  }
  if (t === "overdue") {
    return isOverdue(lead);
  }
  if (t === "followup" || t === "follow-up" || t === "follow") {
    return !!lead.nextFollowUpDate;
  }
  if (t === "unanalyzed" || t === "notanalyzed") {
    return lead.analysisStatus === "not_started";
  }
  if (t === "failed") {
    return lead.analysisStatus === "failed";
  }

  // Free-text fallback: every field a salesperson might plausibly search
  // by, flattened into one blob. Includes the AI's own words (summary,
  // key signals, requirements, objections, recommended action) so a query
  // like "vastu" or "negotiable" finds a lead through what the AI noticed,
  // not just the raw form fields.
  const haystack = [
    lead.name,
    lead.location,
    lead.requirement,
    lead.budget,
    lead.timeline,
    lead.message,
    lead.claimedBy,
    lead.nextFollowUpDate,
    lead.analysis?.summary,
    lead.analysis?.intent,
    lead.analysis?.recommendedAction,
    lead.analysis?.scoreReason,
    ...(lead.analysis?.keySignals || []),
    ...(lead.analysis?.keyRequirements || []),
    ...(lead.analysis?.objections || []),
    ...(lead.analysis?.flags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(t);
}

export function matchesSearch(lead: Lead, query: string): boolean {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => tokenMatches(lead, t));
}
