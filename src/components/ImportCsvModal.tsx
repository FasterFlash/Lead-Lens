"use client";

interface Props {
  onClose: () => void;
}

// Placeholder for a real feature, not a dead-end button. Typing leads in
// one-by-one doesn't scale once a rep has a spreadsheet of 50 inquiries from
// a portal export or an event signup sheet — this is here so that need is
// visibly acknowledged (and roughly scoped) instead of silently missing.
export default function ImportCsvModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Import from CSV</h2>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              A future feature
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600">
            Not built yet — flagged here because typing leads in one at a time
            stops scaling fast. This is what it&apos;s planned to do:
          </p>
          <ul className="mt-3 space-y-2.5">
            {[
              "Bulk-add leads straight from a spreadsheet export (portal download, event sign-up sheet) instead of re-typing each one by hand",
              "Map your own sheet's columns to name/location/budget/etc. — no need to pre-format the file to match this app",
              "Preview every row before anything is added, so one bad row can't silently corrupt the queue",
              "Flag likely duplicates against existing leads (by name + location) before import, instead of creating silent copies",
            ].map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="text-indigo-400 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-end">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
