"use client";

import { useState } from "react";
import { CONTACT_OUTCOME_LABELS, type ContactOutcome } from "@/lib/types";

interface Props {
  onLog: (outcome: ContactOutcome, notes: string, nextFollowUpDate?: string) => void;
}

// Everything a rep can do here is a real call outcome EXCEPT "scheduled" —
// that one is deliberately excluded from this dropdown and handled by its
// own "Schedule" mode below, because picking it from a list of call
// outcomes would wrongly imply a call happened.
const LOGGABLE_OUTCOMES = (Object.keys(CONTACT_OUTCOME_LABELS) as ContactOutcome[]).filter(
  (o) => o !== "scheduled"
);

type Mode = "log" | "schedule";

export default function OutcomeLogForm({ onLog }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);

  const [outcome, setOutcome] = useState<ContactOutcome>("call_back_later");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");

  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleNote, setScheduleNote] = useState("");

  const needsFollowUp = outcome === "call_back_later" || outcome === "no_answer";

  const resetAndClose = () => {
    setNotes("");
    setFollowUp("");
    setScheduleDate("");
    setScheduleNote("");
    setMode(null);
  };

  const submitLog = (e: React.FormEvent) => {
    e.preventDefault();
    onLog(outcome, notes, needsFollowUp && followUp ? followUp : undefined);
    resetAndClose();
  };

  const submitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate) return; // a schedule with no date isn't a schedule
    onLog("scheduled", scheduleNote, scheduleDate);
    resetAndClose();
  };

  if (mode === null) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setMode("log")}
          className="flex-1 text-sm px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm"
        >
          Call Log
        </button>
        <button
          onClick={() => setMode("schedule")}
          className="flex-1 text-sm px-3 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 font-medium shadow-sm"
        >
          Schedule
        </button>
      </div>
    );
  }

  if (mode === "schedule") {
    return (
      <form onSubmit={submitSchedule} className="border rounded-lg p-3 bg-white space-y-2">
        <label className="text-xs font-medium text-slate-600">
          Schedule a first call — no call has happened yet, this just puts it on the clock
        </label>
        <input
          type="date"
          value={scheduleDate}
          required
          onChange={(e) => setScheduleDate(e.target.value)}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
        />
        <textarea
          value={scheduleNote}
          onChange={(e) => setScheduleNote(e.target.value)}
          placeholder="Note for why / what to say (optional)"
          rows={2}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={resetAndClose}
            className="text-xs px-2.5 py-1 rounded border border-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="text-xs px-2.5 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-700 font-medium"
          >
            Schedule
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitLog} className="border rounded-lg p-3 bg-white space-y-2">
      <label className="text-xs font-medium text-slate-600">What happened on the call?</label>
      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value as ContactOutcome)}
        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
      >
        {LOGGABLE_OUTCOMES.map((o) => (
          <option key={o} value={o}>
            {CONTACT_OUTCOME_LABELS[o]}
          </option>
        ))}
      </select>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes from the call (optional)"
        rows={2}
        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
      />
      {needsFollowUp && (
        <div>
          <label className="text-xs font-medium text-slate-600">Follow up on</label>
          <input
            type="date"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
          />
        </div>
      )}
      {outcome === "not_interested" && (
        <p className="text-xs text-orange-600">
          This will release the lead back to the open pool for other reps.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={resetAndClose}
          className="text-xs px-2.5 py-1 rounded border border-slate-300"
        >
          Cancel
        </button>
        <button type="submit" className="text-xs px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
          Save
        </button>
      </div>
    </form>
  );
}
