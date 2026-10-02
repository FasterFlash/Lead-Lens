"use client";

import { useEffect, useState } from "react";

/** Collapses from a large name display into a thin identity strip once the
 *  page scrolls — same pattern as AWS's account bar. Shows the rep's name
 *  only; no greeting copy, no "welcome back" — just who's logged in, same
 *  spirit as the rest of the dashboard (information, not decoration). */
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
      className={`flex items-center border-b border-slate-200/70 bg-white/95 backdrop-blur transition-all duration-200 ${
        collapsed ? "px-4 py-1" : "px-4 py-3"
      }`}
    >
      <span
        className={`font-semibold text-slate-800 transition-all duration-200 ${
          collapsed ? "text-[11px] uppercase tracking-wider text-slate-400" : "text-lg"
        }`}
      >
        {name}
      </span>
    </div>
  );
}
