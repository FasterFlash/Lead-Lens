"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLeads } from "@/lib/useLeads";
import ChatPanel from "@/components/ChatPanel";
import OutcomeLogForm from "@/components/OutcomeLogForm";
import AccountBar from "@/components/AccountBar";
import { CONTACT_OUTCOME_LABELS, type ContactOutcome, type PriorityTag } from "@/lib/types";

// One place that defines "what does hot/warm/cold actually look like" for
// this whole page — badge, the hero panel's tint + accent bar, and the text
// color used on top of that tint. Reused everywhere instead of re-deriving
// per element (that's how the badge went colorless before: it was hardcoded
// instead of driven from this).
const PRIORITY_STYLES: Record<
  PriorityTag,
  { badge: string; heroBg: string; heroBorder: string; accentText: string; chip: string }
> = {
  hot: {
    badge: "bg-red-600 text-white",
    heroBg: "bg-red-50",
    heroBorder: "border-red-500",
    accentText: "text-red-700",
    chip: "bg-white/70 text-red-700 border border-red-200",
  },
  warm: {
    badge: "bg-amber-500 text-white",
    heroBg: "bg-amber-50",
    heroBorder: "border-amber-500",
    accentText: "text-amber-700",
    chip: "bg-white/70 text-amber-700 border border-amber-200",
  },
  cold: {
    badge: "bg-slate-500 text-white",
    heroBg: "bg-slate-100",
    heroBorder: "border-slate-400",
    accentText: "text-slate-600",
    chip: "bg-white/70 text-slate-600 border border-slate-300",
  },
};

const OUTCOME_DOT: Record<ContactOutcome, string> = {
  interested: "bg-green-500",
  call_back_later: "bg-amber-500",
  not_interested: "bg-red-500",
  no_answer: "bg-slate-400",
  asked_for_alternatives: "bg-blue-500",
  scheduled: "bg-sky-500",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { leads, initialized, claimLead, logOutcome, sendChatMessage, triggerAnalysis, currentRep } =
    useLeads();

  const leadId = params.id as string;
  const lead = leads.find((l) => l.id === leadId);

  if (!initialized) return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Lead not found.</p>
        <Link href="/" className="text-sm text-indigo-600 underline">
          Back to queue
        </Link>
      </div>
    );
  }

  const a = lead.analysis;
  const style = a ? PRIORITY_STYLES[a.priorityTag] : null;

  return (
    <main className="min-h-screen">
      <div className="sticky top-0 z-20">
        <AccountBar name={currentRep} />
        <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              aria-label="Back to queue"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 transition shrink-0"
            >
              ←
            </button>
            <h1 className="font-bold text-lg text-slate-900">{lead.name}</h1>
            {a && (
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${style!.badge}`}
              >
                {a.priorityTag} · {a.score}
              </span>
            )}
          </div>
          {lead.status === "unclaimed" && (
            <button
              onClick={() => claimLead(lead.id)}
              className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
            >
              Claim lead
            </button>
          )}
          {lead.status === "claimed" && lead.claimedBy === currentRep && (
            <span className="text-xs text-indigo-700 font-medium">You&apos;ve claimed this lead</span>
          )}
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:items-start">
        {/* LEFT: one single container, sectioned by dividers and color — never
            boxes stacked inside boxes. */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-w-0">
          {/* Hero: the one thing a salesperson reads before dialing. Flat
              color-tinted panel, no nested card — typography and spacing do
              the separating, not more borders. */}
          {a && style && (
            <div className={`p-5 border-l-4 ${style.heroBorder} ${style.heroBg}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <p className="text-base font-semibold text-slate-900 leading-snug max-w-xl">
                  {a.summary}
                </p>
                <span
                  className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-md shrink-0 whitespace-nowrap ${style.chip}`}
                >
                  {a.recommendedAction}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1.5">{a.intent}</p>
              <p className={`text-xs mt-2 ${style.accentText}`}>{a.scoreReason}</p>

              {a.keySignals && a.keySignals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {a.keySignals.map((s, i) => (
                    <span
                      key={i}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.chip}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 pl-3 border-l-2 border-white/80">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Say this first
                </div>
                <p className="text-sm text-slate-800 mt-0.5">{a.suggestedResponse}</p>
              </div>

              <p className="text-[11px] text-slate-400 mt-3">
                Analyzed by {a.analyzedByModel} · {formatTimestamp(a.analyzedAt)}
              </p>
            </div>
          )}

          {!a && (
            <div className="p-5 border-l-4 border-slate-300 bg-slate-50">
              {lead.analysisStatus === "not_started" && (
                <div className="text-sm text-slate-600 space-y-2">
                  <p>Not analyzed yet — waiting for a manual trigger so testing doesn&apos;t spend API quota.</p>
                  <button
                    onClick={() => triggerAnalysis(lead.id)}
                    className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
                  >
                    Analyze now
                  </button>
                </div>
              )}
              {lead.analysisStatus === "pending" && (
                <p className="text-sm text-slate-400 animate-pulse">Analyzing…</p>
              )}
              {lead.analysisStatus === "failed" && (
                <div className="text-sm text-red-600 space-y-2">
                  <p>{lead.analysisError || "Analysis failed."}</p>
                  <button
                    onClick={() => triggerAnalysis(lead.id)}
                    className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Signals that support the brief but don't need the same visual
              weight — flat on the page, separated from the hero by a divider
              and from each other by spacing alone. */}
          {a && (a.keyRequirements.length > 0 || a.objections.length > 0 || a.flags.length > 0) && (
            <div className="p-5 border-t border-slate-100 space-y-3">
              {a.keyRequirements.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Key requirements
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.keyRequirements.map((r, i) => (
                      <span key={i} className="text-xs text-slate-600">
                        {r}
                        {i < a.keyRequirements.length - 1 ? " ·" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {a.objections.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Objections
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.objections.map((o, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 border border-amber-100"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {a.flags.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
                    ⚠ Flags
                  </div>
                  <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
                    {a.flags.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Raw data — reference material, deliberately quiet. No card,
              no border around the message, just a thin left rule like a
              quote so it reads as "source text" not "a panel." */}
          <div className="p-5 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Raw lead data
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mb-2">
              <span>
                <span className="text-slate-400">Location </span>
                {lead.location || "—"}
              </span>
              <span>
                <span className="text-slate-400">Requirement </span>
                {lead.requirement || "—"}
              </span>
              <span>
                <span className="text-slate-400">Budget </span>
                {lead.budget || "—"}
              </span>
              <span>
                <span className="text-slate-400">Timeline </span>
                {lead.timeline || "—"}
              </span>
            </div>
            <p className="text-sm text-slate-500 italic pl-3 border-l-2 border-slate-200 whitespace-pre-wrap">
              {lead.message || "(no message provided)"}
            </p>
          </div>

          {/* Contact history — a timeline, not a stack of bordered cards. */}
          <div className="p-5 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Contact history ({lead.contactLogs.length})
            </div>
            {lead.contactLogs.length === 0 && (
              <p className="text-sm text-slate-400 mb-3">No contact attempts logged yet.</p>
            )}
            {lead.contactLogs.length > 0 && (
              <div className="mb-4">
                {lead.contactLogs.map((log, i) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center pt-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${OUTCOME_DOT[log.outcome]}`} />
                      {i < lead.contactLogs.length - 1 && (
                        <span className="w-px flex-1 bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className={i < lead.contactLogs.length - 1 ? "pb-4 flex-1 min-w-0" : "flex-1 min-w-0"}>
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-semibold text-sm text-slate-800">
                          {CONTACT_OUTCOME_LABELS[log.outcome]}
                        </span>
                        <span className="text-xs text-slate-400 shrink-0" title={formatTimestamp(log.timestamp)}>
                          {timeAgo(log.timestamp)}
                        </span>
                      </div>
                      {log.notes && <p className="text-sm text-slate-600 mt-0.5">{log.notes}</p>}
                      {log.nextFollowUpDate && (
                        <p className="text-xs text-orange-700 font-medium mt-1">
                          Follow up: {log.nextFollowUpDate}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <OutcomeLogForm
              onLog={(outcome, notes, nextFollowUpDate) =>
                logOutcome(lead.id, outcome, notes, nextFollowUpDate)
              }
            />
          </div>
        </div>

        {/* RIGHT: grounded chat — fills the viewport height, not a fixed pixel cap */}
        <div className="lg:sticky lg:top-[108px] lg:h-[calc(100vh-124px)]">
          <ChatPanel history={lead.chatHistory} onAsk={(q) => sendChatMessage(lead.id, q)} />
        </div>
      </div>
    </main>
  );
}
