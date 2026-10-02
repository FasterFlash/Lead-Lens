"use client";

import { useState } from "react";
import type { LeadFormInput } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (input: LeadFormInput) => Promise<void>;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): LeadFormInput {
  return {
    name: "",
    location: "",
    requirement: "",
    budget: "",
    timeline: "",
    message: "",
    requestedAt: todayStr(),
  };
}

export default function LeadIntakeForm({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState<LeadFormInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof LeadFormInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  };

  // Shared input styling — one place to keep every field visually
  // consistent (same radius, border, focus ring) instead of repeating the
  // class string seven times with room for one of them to drift.
  const fieldCls =
    "w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50/50 transition focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white";
  const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-lg text-slate-900">New Lead</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Log an inquiry manually — the AI will analyze it on submit.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={update("name")}
                required
                placeholder="e.g. Ramesh Iyer"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Date requested</label>
              <input
                type="date"
                value={form.requestedAt}
                max={todayStr()}
                onChange={update("requestedAt")}
                className={fieldCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Location</label>
              <input
                value={form.location}
                onChange={update("location")}
                placeholder="e.g. Whitefield, Bangalore"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Requirement</label>
              <input
                value={form.requirement}
                onChange={update("requirement")}
                placeholder="e.g. 3BHK apartment"
                className={fieldCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Budget</label>
              <input
                value={form.budget}
                onChange={update("budget")}
                placeholder="e.g. 70L, AED 1.2M"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Timeline</label>
              <input
                value={form.timeline}
                onChange={update("timeline")}
                placeholder="e.g. Immediate, 3-6 months"
                className={fieldCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Customer Message</label>
            <textarea
              value={form.message}
              onChange={update("message")}
              rows={4}
              placeholder="Paste exactly what the customer said, unedited…"
              className={`${fieldCls} resize-none`}
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-50 shadow-sm transition"
            >
              {submitting ? "Analyzing…" : "Add & Analyze"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
