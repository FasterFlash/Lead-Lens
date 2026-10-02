"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface Props {
  history: ChatMessage[];
  onAsk: (question: string) => Promise<void>;
}

// Static, hand-written — no AI call to generate these, that would burn
// quota for a cosmetic feature. Grouped into sets of 3; each click on a
// suggestion rotates to the next set so the salesperson always has fresh
// quick-access prompts without the panel going empty after one click.
const SUGGESTION_SETS: string[][] = [
  [
    "What should I emphasize on the call?",
    "They seem price-sensitive — how do I handle that?",
    "Make my opening line more assertive.",
  ],
  [
    "What objection should I expect first?",
    "How do I create urgency without sounding pushy?",
    "Summarize this lead in one line for my manager.",
  ],
  [
    "What question should I ask to qualify them further?",
    "Draft a short WhatsApp follow-up for this lead.",
    "Is this lead actually serious, or just browsing?",
  ],
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ChatPanel({ history, onAsk }: Props) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [setIndex, setSetIndex] = useState(0);

  const submit = async (q: string, fromSuggestion = false) => {
    if (!q.trim() || asking) return;
    setAsking(true);
    setQuestion("");
    if (fromSuggestion) setSetIndex((i) => (i + 1) % SUGGESTION_SETS.length);
    await onAsk(q);
    setAsking(false);
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white flex flex-col h-full shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 border-b border-slate-200 font-semibold text-sm text-slate-800 bg-slate-50 shrink-0">
        Ask about this lead
      </div>

      {/* Only grows to fill space once there's an actual conversation —
          otherwise it sits at natural height so the hint/suggestions don't
          end up stranded with a dead gap between them. */}
      <div className={`${history.length > 0 ? "flex-1 overflow-y-auto" : ""} p-3 space-y-2`}>
        {history.map((m) =>
          m.isError ? (
            // A failure, not an answer — a quiet centered notice, never a
            // normal assistant bubble, so it never reads as "the AI said
            // this." No raw error text ever lands here (see lib/aiErrors.ts).
            <div key={m.id} className="text-xs text-slate-400 text-center px-4 py-1">
              {m.content}
            </div>
          ) : (
            <div
              key={m.id}
              className={`text-sm rounded-xl px-3 py-2 max-w-[90%] leading-snug ${
                m.role === "user"
                  ? "bg-indigo-600 text-white ml-auto"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
              <div
                className={`text-[10px] mt-1 ${m.role === "user" ? "text-indigo-200" : "text-slate-400"}`}
              >
                {timeAgo(m.timestamp)}
              </div>
            </div>
          )
        )}
        {asking && (
          <div className="text-sm text-slate-400 px-3 py-2 animate-pulse">Thinking…</div>
        )}
        {history.length === 0 && !asking && (
          <p className="text-xs text-slate-400 px-1 py-2">
            Ask anything grounded in this lead&apos;s data, or tap a suggestion below.
          </p>
        )}
      </div>

      {/* Suggestions stay available for the whole session, not just on
          first open — rotates to a new set after each use. */}
      <div className="px-3 pt-2 space-y-1.5 border-t border-slate-100 shrink-0">
        {SUGGESTION_SETS[setIndex].map((s) => (
          <button
            key={s}
            disabled={asking}
            onClick={() => submit(s, true)}
            className="block w-full text-left text-xs px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Absorbs leftover space only when the conversation is empty, so the
          input stays pinned to the bottom without stranding a gap above. */}
      {history.length === 0 && <div className="flex-1" />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="border-t border-slate-200 p-2 flex gap-2 shrink-0"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about this lead…"
          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={asking}
          className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
