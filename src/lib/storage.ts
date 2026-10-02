import type { ChatMessage, ContactLog, Lead, LeadFormInput } from "./types";

const STORAGE_KEY = "masal_leads_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadLeads(): Lead[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted or blocked storage (private window, etc.) — fail safe to
    // empty rather than crash the app.
    return [];
  }
}

export function saveLeads(leads: Lead[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // Storage full or unavailable — swallow. The in-memory state in the
    // React tree still works for the rest of the session.
  }
}

/** Turns the rep-entered "date requested" (YYYY-MM-DD, or absent) into the
 *  ISO timestamp stored as createdAt. Today's date keeps the real
 *  current time (so same-day adds still order correctly against each
 *  other); a backdated date is anchored to local noon so it can't shift to
 *  the wrong calendar day depending on timezone when displayed later. */
function requestedAtToIso(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return new Date().toISOString();
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

export function createLeadSkeleton(input: LeadFormInput): Lead {
  const { requestedAt, ...rest } = input;
  return {
    id: genId(),
    createdAt: requestedAtToIso(requestedAt),
    ...rest,
    analysis: null,
    // Seed/demo leads sit unanalyzed until the user explicitly triggers it —
    // see useLeads.ts. Leads added through the form are flipped to "pending"
    // immediately since submitting the form IS the explicit trigger.
    analysisStatus: "not_started",
    status: "unclaimed",
    contactLogs: [],
    chatHistory: [],
  };
}

export function upsertLead(leads: Lead[], updated: Lead): Lead[] {
  const idx = leads.findIndex((l) => l.id === updated.id);
  if (idx === -1) return [updated, ...leads];
  const next = [...leads];
  next[idx] = updated;
  return next;
}

export function claimLead(lead: Lead, claimedBy: string): Lead {
  return {
    ...lead,
    status: "claimed",
    claimedBy,
    claimedAt: new Date().toISOString(),
  };
}

/** Logging an outcome is the core of the invented feature: it updates
 *  status, records history, and sets/clears the follow-up date that
 *  drives re-ranking. "not_interested" also releases the lead back to
 *  the open pool, matching the real-world pattern the user described
 *  (abandoned lead becomes available to another rep). */
export function logContactOutcome(
  lead: Lead,
  outcome: ContactLog["outcome"],
  notes: string,
  nextFollowUpDate?: string
): Lead {
  const log: ContactLog = {
    id: genId(),
    timestamp: new Date().toISOString(),
    outcome,
    notes,
    nextFollowUpDate,
  };

  const releasesLead = outcome === "not_interested";
  // A "scheduled" entry is not a call outcome — no contact was actually
  // made, so the lead's status must not flip to "contacted" just because
  // a date got put on it.
  const isScheduleOnly = outcome === "scheduled";

  return {
    ...lead,
    contactLogs: [...lead.contactLogs, log],
    status: releasesLead ? "unclaimed" : isScheduleOnly ? lead.status : "contacted",
    claimedBy: releasesLead ? undefined : lead.claimedBy,
    nextFollowUpDate: releasesLead ? undefined : nextFollowUpDate,
  };
}

export function appendChatMessage(lead: Lead, message: ChatMessage): Lead {
  return { ...lead, chatHistory: [...lead.chatHistory, message] };
}
