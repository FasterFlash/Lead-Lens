"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLeads } from "@/lib/useLeads";
import { sortLeadsByPriority, isOverdue } from "@/lib/ranking";
import type { Lead, PriorityTag } from "@/lib/types";
import LeadIntakeForm from "@/components/LeadIntakeForm";
import ImportCsvModal from "@/components/ImportCsvModal";
import AccountBar from "@/components/AccountBar";
import { extractKeywordTags } from "@/lib/keywordTags";
import { matchesSearch } from "@/lib/search";
import {
  matchesFollowUpFilter,
  NO_FOLLOW_UP_FILTER,
  type FollowUpFilterMode,
  type FollowUpFilterState,
} from "@/lib/followUpFilter";
import {
  matchesRequestedFilter,
  NO_REQUESTED_FILTER,
  type RequestedFilterMode,
  type RequestedFilterState,
} from "@/lib/requestedFilter";

// Solid, bold boxes for priority — this is the single most important
// signal on the row, so it gets the strongest visual weight.
const PRIORITY_BOX_STYLES: Record<PriorityTag, string> = {
  hot: "bg-red-500 text-white",
  warm: "bg-amber-500 text-white",
  cold: "bg-slate-400 text-white",
};

function PriorityBox({ lead, onAnalyze }: { lead: Lead; onAnalyze: () => void }) {
  if (lead.analysis) {
    return (
      <div
        className={`w-full h-full rounded-lg flex flex-col items-center justify-center gap-0.5 shrink-0 ${PRIORITY_BOX_STYLES[lead.analysis.priorityTag]}`}
      >
        <span className="text-xs font-bold uppercase tracking-wide">
          {lead.analysis.priorityTag}
        </span>
        <span className="text-lg font-bold leading-none">{lead.analysis.score}</span>
      </div>
    );
  }
  if (lead.analysisStatus === "pending") {
    return (
      <div className="w-full h-full rounded-lg flex items-center justify-center bg-slate-100 text-slate-400 text-xs animate-pulse">
        Analyzing…
      </div>
    );
  }
  if (lead.analysisStatus === "failed") {
    return (
      <div className="w-full h-full rounded-lg flex items-center justify-center bg-red-50 text-red-500 text-xs text-center px-1">
        Failed
      </div>
    );
  }
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onAnalyze();
      }}
      className="w-full h-full rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-semibold border border-dashed border-indigo-300 hover:bg-indigo-100 transition"
    >
      Analyze
    </button>
  );
}

function StatusBox({ lead }: { lead: Lead }) {
  const map: Record<Lead["status"], { label: string; cls: string }> = {
    unclaimed: { label: "Open", cls: "bg-green-50 text-green-700 border border-green-300" },
    claimed: { label: "Claimed", cls: "bg-blue-50 text-blue-700 border border-blue-300" },
    contacted: { label: "Contacted", cls: "bg-purple-50 text-purple-700 border border-purple-300" },
    closed: { label: "Closed", cls: "bg-slate-100 text-slate-500 border border-slate-300" },
  };
  const s = map[lead.status];
  return (
    <div className={`w-full h-full rounded-lg flex items-center justify-center text-xs font-semibold ${s.cls}`}>
      {s.label}
    </div>
  );
}

// The AI's recommended action is only valid for the lead's state AT THE
// TIME it was analyzed. Once a future follow-up is scheduled, showing the
// original "Call now" alongside it is a direct contradiction — fix by
// deferring to the follow-up state instead of blindly echoing a stale field.
function ActionBox({ lead, overdue }: { lead: Lead; overdue: boolean }) {
  if (!lead.analysis) {
    return (
      <div className="w-full h-full rounded-lg flex items-center justify-center bg-slate-50 text-slate-300 text-xs">
        —
      </div>
    );
  }
  if (lead.nextFollowUpDate && !overdue) {
    return (
      <div className="w-full h-full rounded-lg flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-200 text-[11px] font-medium text-center px-1">
        Scheduled
      </div>
    );
  }
  return (
    <div className="w-full h-full rounded-lg flex items-center justify-center bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium text-center px-1 leading-tight">
      {lead.analysis.recommendedAction}
    </div>
  );
}

// The home row shows WHAT DRIVES THE DECISION, not a prose summary — a
// salesperson scanning 20 rows needs signals, not sentences. Once analyzed,
// these are the AI's own ranked keySignals (strongest first). Before that,
// it's a free, non-AI keyword guess so the row isn't a wall of raw text
// while waiting for a manual "Analyze" click — visually muted/dashed to mark
// it as an unverified guess, not an AI finding.
function SignalTags({ lead }: { lead: Lead }) {
  if (lead.analysis) {
    const tags = lead.analysis.keySignals;
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {tags.slice(0, 5).map((t, i) => (
          <span
            key={i}
            className="text-[11px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium"
          >
            {t}
          </span>
        ))}
      </div>
    );
  }
  const guesses = extractKeywordTags(lead.message);
  if (guesses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {guesses.map((t, i) => (
        <span
          key={i}
          className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-dashed border-slate-300"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// Static once set — this is when the customer's inquiry actually happened
// (rep-entered, defaults to today, backdatable), not when someone happens
// to be looking at the row. Sits between Action and Follow-up per explicit
// request: the "when did this start" fact belongs next to "what's next".
function RequestedBox({ lead }: { lead: Lead }) {
  const label = new Date(lead.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <div className="w-full h-full rounded-lg flex flex-col items-center justify-center gap-0.5 bg-slate-50 border border-slate-200 text-slate-500">
      <span className="text-[10px] font-semibold uppercase tracking-wide">Requested</span>
      <span className="text-xs font-bold text-slate-700">{label}</span>
    </div>
  );
}

// Dedicated box so a follow-up date is never just small gray text hiding
// in a line of metadata — it gets the same visual weight as priority and
// status.
function FollowUpBox({ lead, overdue }: { lead: Lead; overdue: boolean }) {
  if (!lead.nextFollowUpDate) {
    // Default state, not a blank cell — nothing has been scheduled yet,
    // and that's worth saying out loud so a pile of new leads doesn't
    // quietly fall through the cracks. Dashed border matches the same
    // "action available" language as the Analyze button.
    return (
      <div className="w-full h-full rounded-lg flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-[11px] font-medium text-center px-1">
        Unscheduled
      </div>
    );
  }
  return (
    <div
      className={`w-full h-full rounded-lg flex flex-col items-center justify-center gap-0.5 ${
        overdue
          ? "bg-orange-500 text-white animate-pulse"
          : "bg-blue-50 text-blue-700 border border-blue-300"
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide">
        {overdue ? "Overdue" : "Follow-up"}
      </span>
      <span className="text-xs font-bold">{lead.nextFollowUpDate}</span>
    </div>
  );
}

const FOLLOWUP_PRESETS: [FollowUpFilterMode, string][] = [
  ["none", "Any"],
  ["today", "Today"],
  ["overdue", "Overdue"],
  ["next7", "Next 7 days"],
  ["custom", "Custom range"],
];

const REQUESTED_PRESETS: [RequestedFilterMode, string][] = [
  ["none", "Any"],
  ["today", "Today"],
  ["last7", "Last 7 days"],
  ["custom", "Custom range"],
];

const PRIORITY_OPTIONS: PriorityTag[] = ["hot", "warm", "cold"];

export default function Home() {
  const { leads, initialized, addLead, triggerAnalysis, currentRep } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [showImportInfo, setShowImportInfo] = useState(false);
  // Multiselect — "hot AND warm" is a real ask (e.g. "show me everything I
  // can't ignore"), so this is a set of selected tags, not a single value.
  // Empty array == no priority filter applied == "All".
  const [selectedPriorities, setSelectedPriorities] = useState<PriorityTag[]>([]);
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState<FollowUpFilterState>(NO_FOLLOW_UP_FILTER);
  const [followUpFrom, setFollowUpFrom] = useState("");
  const [followUpTo, setFollowUpTo] = useState("");
  const [showFollowUpRange, setShowFollowUpRange] = useState(false);
  const [requested, setRequested] = useState<RequestedFilterState>(NO_REQUESTED_FILTER);
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [showRequestedRange, setShowRequestedRange] = useState(false);
  const [openMenu, setOpenMenu] = useState<null | "priority" | "requested" | "followup">(null);

  const sorted = useMemo(() => {
    const byPriority =
      selectedPriorities.length === 0
        ? leads
        : leads.filter((l) => l.analysis && selectedPriorities.includes(l.analysis.priorityTag));
    const bySearch = byPriority.filter((l) => matchesSearch(l, query));
    const byFollowUp = bySearch.filter((l) => matchesFollowUpFilter(l, followUp));
    const byRequested = byFollowUp.filter((l) => matchesRequestedFilter(l, requested));
    return sortLeadsByPriority(byRequested);
  }, [leads, selectedPriorities, query, followUp, requested]);

  const togglePriority = (tag: PriorityTag) => {
    setSelectedPriorities((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const selectFollowUpPreset = (mode: FollowUpFilterMode) => {
    if (mode === "custom") {
      setShowFollowUpRange(true);
      return;
    }
    setShowFollowUpRange(false);
    setFollowUp(mode === "none" ? NO_FOLLOW_UP_FILTER : { mode });
  };

  const applyFollowUpRange = () => {
    setFollowUp({ mode: "custom", from: followUpFrom || undefined, to: followUpTo || undefined });
  };

  const clearFollowUpFilter = () => {
    setFollowUp(NO_FOLLOW_UP_FILTER);
    setFollowUpFrom("");
    setFollowUpTo("");
    setShowFollowUpRange(false);
  };

  const selectRequestedPreset = (mode: RequestedFilterMode) => {
    if (mode === "custom") {
      setShowRequestedRange(true);
      return;
    }
    setShowRequestedRange(false);
    setRequested(mode === "none" ? NO_REQUESTED_FILTER : { mode });
  };

  const applyRequestedRange = () => {
    setRequested({ mode: "custom", from: requestedFrom || undefined, to: requestedTo || undefined });
  };

  const clearRequestedFilter = () => {
    setRequested(NO_REQUESTED_FILTER);
    setRequestedFrom("");
    setRequestedTo("");
    setShowRequestedRange(false);
  };

  const anyFilterActive =
    selectedPriorities.length > 0 ||
    query !== "" ||
    followUp.mode !== "none" ||
    requested.mode !== "none";

  const clearAllFilters = () => {
    setSelectedPriorities([]);
    setQuery("");
    clearFollowUpFilter();
    clearRequestedFilter();
    setOpenMenu(null);
  };

  const counts = useMemo(() => {
    const c = { hot: 0, warm: 0, cold: 0, overdue: 0 };
    leads.forEach((l) => {
      if (l.analysis?.priorityTag) c[l.analysis.priorityTag]++;
      if (isOverdue(l)) c.overdue++;
    });
    return c;
  }, [leads]);

  if (!initialized) {
    return <div className="p-6 text-sm text-slate-500">Loading leads…</div>;
  }

  return (
    <main className="min-h-screen">
      <div className="sticky top-0 z-20">
        <AccountBar name={currentRep} />
        <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-slate-900">Lead Queue</h1>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded-md bg-red-50 text-red-700 font-medium">
                {counts.hot} hot
              </span>
              <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-medium">
                {counts.warm} warm
              </span>
              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">
                {counts.cold} cold
              </span>
              {counts.overdue > 0 && (
                <span className="px-2 py-1 rounded-md bg-orange-100 text-orange-800 font-medium animate-pulse">
                  {counts.overdue} overdue
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportInfo(true)}
              className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium transition"
            >
              Import from CSV
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm"
            >
              + New Lead
            </button>
          </div>
        </div>
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-center">
          <div className="relative w-full max-w-xl">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, location, hot/warm/cold, claimed, overdue, vastu…"
              className="w-full pl-10 pr-9 py-2.5 border border-slate-300 rounded-full text-sm shadow-sm transition focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-3 text-xs relative z-30">
          {/* Priority — multiselect */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "priority" ? null : "priority")}
              className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 font-medium transition ${
                selectedPriorities.length > 0
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide opacity-70">Priority</span>
              {selectedPriorities.length === 0
                ? "All"
                : selectedPriorities.map((p) => p[0].toUpperCase() + p.slice(1)).join(", ")}
              <span className="text-[10px]">▾</span>
            </button>
            {openMenu === "priority" && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg py-1 min-w-[160px] z-40">
                {PRIORITY_OPTIONS.map((tag) => {
                  const checked = selectedPriorities.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => togglePriority(tag)}
                      className={`w-full flex items-center gap-2 text-left px-3 py-1.5 hover:bg-slate-50 ${
                        checked ? "text-indigo-600 font-semibold" : "text-slate-600"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] shrink-0 ${
                          checked
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      {tag[0].toUpperCase() + tag.slice(1)}
                    </button>
                  );
                })}
                {selectedPriorities.length > 0 && (
                  <button
                    onClick={() => setSelectedPriorities([])}
                    className="w-full text-left px-3 py-1.5 border-t border-slate-100 mt-1 text-slate-400 hover:text-slate-700"
                  >
                    Clear filter ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Requested-date dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "requested" ? null : "requested")}
              className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 font-medium transition ${
                requested.mode !== "none"
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide opacity-70">Requested</span>
              {showRequestedRange
                ? "Custom range"
                : REQUESTED_PRESETS.find(([m]) => m === requested.mode)?.[1] ?? "Any"}
              <span className="text-[10px]">▾</span>
            </button>
            {openMenu === "requested" && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg py-1 min-w-[180px] z-40">
                {REQUESTED_PRESETS.map(([mode, label]) => {
                  const active = mode === "custom" ? showRequestedRange : requested.mode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        selectRequestedPreset(mode);
                        if (mode !== "custom") setOpenMenu(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${
                        active ? "text-slate-900 font-semibold" : "text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                {showRequestedRange && (
                  <div className="px-3 py-2 border-t border-slate-100 mt-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={requestedFrom}
                        onChange={(e) => setRequestedFrom(e.target.value)}
                        className="w-full px-1.5 py-1 border border-slate-300 rounded-md text-xs"
                      />
                      <span className="text-slate-400 shrink-0">to</span>
                      <input
                        type="date"
                        value={requestedTo}
                        onChange={(e) => setRequestedTo(e.target.value)}
                        className="w-full px-1.5 py-1 border border-slate-300 rounded-md text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        applyRequestedRange();
                        setOpenMenu(null);
                      }}
                      className="w-full px-2.5 py-1 rounded-md bg-slate-700 text-white hover:bg-slate-800 font-medium"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {requested.mode !== "none" && (
                  <button
                    onClick={() => {
                      clearRequestedFilter();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 border-t border-slate-100 mt-1 text-slate-400 hover:text-slate-700"
                  >
                    Clear filter ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Follow-up dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "followup" ? null : "followup")}
              className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 font-medium transition ${
                followUp.mode !== "none"
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide opacity-70">Follow-up</span>
              {showFollowUpRange
                ? "Custom range"
                : FOLLOWUP_PRESETS.find(([m]) => m === followUp.mode)?.[1] ?? "Any"}
              <span className="text-[10px]">▾</span>
            </button>
            {openMenu === "followup" && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg py-1 min-w-[180px] z-40">
                {FOLLOWUP_PRESETS.map(([mode, label]) => {
                  const active = mode === "custom" ? showFollowUpRange : followUp.mode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        selectFollowUpPreset(mode);
                        if (mode !== "custom") setOpenMenu(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${
                        active ? "text-sky-600 font-semibold" : "text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                {showFollowUpRange && (
                  <div className="px-3 py-2 border-t border-slate-100 mt-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={followUpFrom}
                        onChange={(e) => setFollowUpFrom(e.target.value)}
                        className="w-full px-1.5 py-1 border border-slate-300 rounded-md text-xs"
                      />
                      <span className="text-slate-400 shrink-0">to</span>
                      <input
                        type="date"
                        value={followUpTo}
                        onChange={(e) => setFollowUpTo(e.target.value)}
                        className="w-full px-1.5 py-1 border border-slate-300 rounded-md text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        applyFollowUpRange();
                        setOpenMenu(null);
                      }}
                      className="w-full px-2.5 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-700 font-medium"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {followUp.mode !== "none" && (
                  <button
                    onClick={() => {
                      clearFollowUpFilter();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 border-t border-slate-100 mt-1 text-slate-400 hover:text-slate-700"
                  >
                    Clear filter ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* One-click reset for every filter + the search box at once */}
          {anyFilterActive && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 font-medium hover:bg-red-100 transition flex items-center gap-1"
            >
              Clear all filters ✕
            </button>
          )}
        </div>
        {openMenu && (
          <div className="fixed inset-0 z-20" onClick={() => setOpenMenu(null)} />
        )}
      </div>

      {/* Lead list — this IS the home screen. 6-box row: priority | status | info | action | requested | follow-up */}
      <div className="px-4 py-4 space-y-2 max-w-7xl mx-auto">
        {sorted.map((lead) => {
          const overdue = isOverdue(lead);
          return (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="grid grid-cols-[96px_104px_1fr_104px_104px_104px] gap-3 bg-white border border-slate-200 rounded-xl px-3 py-3 hover:shadow-md hover:border-slate-300 transition shadow-sm"
            >
              <PriorityBox lead={lead} onAnalyze={() => triggerAnalysis(lead.id)} />
              <StatusBox lead={lead} />
              <div className="min-w-0 flex flex-col justify-center">
                <span className="font-semibold text-slate-900 truncate">{lead.name}</span>
                <p className="text-xs text-slate-400 truncate">
                  {lead.location || "no location"} · {lead.requirement || "no requirement"} ·{" "}
                  {lead.budget || "no budget"}
                </p>
                <SignalTags lead={lead} />
              </div>
              <ActionBox lead={lead} overdue={overdue} />
              <RequestedBox lead={lead} />
              <FollowUpBox lead={lead} overdue={overdue} />
            </Link>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-sm text-slate-400 py-8 text-center">
            {query ? `No leads match "${query}".` : "No leads match this filter."}
          </div>
        )}
      </div>

      {showForm && (
        <LeadIntakeForm
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            await addLead(input);
            setShowForm(false);
          }}
        />
      )}

      {showImportInfo && <ImportCsvModal onClose={() => setShowImportInfo(false)} />}
    </main>
  );
}
