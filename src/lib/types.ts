// Core data model for the lead-prioritization tool.
// Persistence is client-side (localStorage) — see README for why.

export type LeadStatus = "unclaimed" | "claimed" | "contacted" | "closed";

export type PriorityTag = "hot" | "warm" | "cold";

export type ContactOutcome =
  | "interested"
  | "call_back_later"
  | "not_interested"
  | "no_answer"
  | "asked_for_alternatives"
  // Not a call outcome at all — a lead the rep hasn't called yet, but has
  // deliberately put a date on so it doesn't silently fall to the bottom of
  // a growing pile. Distinct from the others: logging it does NOT mark the
  // lead "contacted" (see logContactOutcome in storage.ts).
  | "scheduled";

export const CONTACT_OUTCOME_LABELS: Record<ContactOutcome, string> = {
  interested: "Interested — moving forward",
  call_back_later: "Asked to call back later",
  not_interested: "Not interested",
  no_answer: "No answer",
  asked_for_alternatives: "Asked for other options",
  scheduled: "Scheduled — not yet contacted",
};

/** One logged attempt to reach the lead. This is the backbone of the
 *  "invented feature": a running history, not a one-shot score. */
export interface ContactLog {
  id: string;
  timestamp: string; // ISO
  outcome: ContactOutcome;
  notes: string;
  /** If set, the lead is expected to be followed up on this date. */
  nextFollowUpDate?: string;
}

/** Structured output of the AI analysis call. Every field here must be
 *  traceable back to the lead's own data — nothing generic. */
export interface AIAnalysis {
  summary: string;
  intent: string;
  /** The 3-5 tags that most drive the decision on this specific lead —
   *  freely worded by the model, ranked strongest-signal-first. This is
   *  what shows on the home-page row, NOT the full summary sentence. */
  keySignals: string[];
  keyRequirements: string[];
  objections: string[];
  score: number; // 0-100
  priorityTag: PriorityTag;
  scoreReason: string;
  recommendedAction: string;
  suggestedResponse: string;
  /** Things worth a human's attention: data conflicts, insufficient info,
   *  unrealistic budget/requirement mismatch, etc. Not hidden, surfaced. */
  flags: string[];
  analyzedAt: string; // ISO
  /** Which model actually produced this result — visible so a fallback
   *  isn't silent. e.g. "gemini-3.8-flash" or "gemini-2.5-flash-lite (fallback)" */
  analyzedByModel: string;
}

/** "not_started": seed/demo lead, no API call made yet — waiting for the
 *  user to trigger it manually so testing doesn't burn free-tier quota. */
export type AnalysisStatus = "not_started" | "pending" | "done" | "failed";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO
  /** True only for a friendly failure notice (AI busy / network issue),
   *  never a real answer. Lets the UI render it as a quiet system notice
   *  instead of a normal assistant bubble. */
  isError?: boolean;
}

export interface Lead {
  id: string;
  createdAt: string; // ISO

  // --- Core intake fields (required by the brief) ---
  name: string;
  location: string;
  requirement: string; // e.g. "3BHK apartment"
  budget: string; // free text on purpose — "70L", "1.2Cr", "AED 900k", "50-60L nego"
  timeline: string; // e.g. "Immediate", "3-6 months", "Just exploring"
  message: string; // raw free-text customer inquiry — the messy, real field

  // --- AI analysis ---
  analysis: AIAnalysis | null;
  analysisStatus: AnalysisStatus;
  analysisError?: string;

  // --- Ownership / collision handling ---
  status: LeadStatus;
  claimedBy?: string;
  claimedAt?: string;

  // --- Outcome history (the invented feature) ---
  contactLogs: ContactLog[];
  nextFollowUpDate?: string;

  // --- Per-lead grounded chat ---
  chatHistory: ChatMessage[];
}

/** What the intake form actually submits. */
export interface LeadFormInput
  extends Pick<Lead, "name" | "location" | "requirement" | "budget" | "timeline" | "message"> {
  /** When the customer's inquiry actually happened (YYYY-MM-DD), as entered
   *  by the rep — defaults to today in the form, but editable so a lead
   *  that came in yesterday (and is only being logged now) still gets the
   *  right date instead of "now". Becomes the lead's createdAt. */
  requestedAt?: string;
}
