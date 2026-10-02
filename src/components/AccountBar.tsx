"use client";

import { useEffect, useState } from "react";

/** Collapses from a large brand/name display into a thin identity strip
 *  once the page scrolls — same pattern as AWS's account bar. Product name
 *  lives on the left (this is the one place in the app that actually says
 *  "LeadLens" — the rest is screenshots/README only, so a fresh viewer
 *  landing straight on the deployed app had no way to know the app's name).
 *  The rep's name moves to the right, same spirit as an account menu being
 *  on the right in most dashboards — information, not decoration, just
 *  ordered the way people expect to scan it. */
export default function AccountBar({ name }: { name: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 36);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`flex items-center justify-between border-b border-slate-200/70 bg-white/95 backdrop-blur transition-all duration-200 ${
        collapsed ? "px-4 py-1" : "px-4 py-3"
      }`}
    >
      <span
        className={`font-bold text-indigo-700 transition-all duration-200 ${
          collapsed ? "text-[11px] uppercase tracking-wider" : "text-lg"
        }`}
      >
        LeadLens
      </span>
      <span
        className={`font-semibold text-slate-800 transition-all duration-200 ${
          collapsed ? "text-[11px] uppercase tracking-wider text-slate-400" : "text-sm"
        }`}
      >
        {name}
      </span>
    </div>
  );
}
