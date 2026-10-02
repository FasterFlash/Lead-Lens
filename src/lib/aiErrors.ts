// Central place that turns a raw AI/network failure into something a
// salesperson can actually read. Nothing here ever shows "503", a stack
// trace, or "AI analysis failed: <raw gemini text>" to the browser — the
// raw message is logged server-side (console.error at the call site) for
// debugging and stops there.

type Kind = "busy" | "network" | "unknown";

function classify(raw: string): Kind {
  const m = raw.toLowerCase();
  if (
    m.includes("quota") ||
    m.includes("rate") ||
    m.includes("429") ||
    m.includes("503") ||
    m.includes("overloaded") ||
    m.includes("high demand") ||
    m.includes("unavailable")
  ) {
    return "busy";
  }
  if (
    m.includes("fetch") ||
    m.includes("network") ||
    m.includes("econn") ||
    m.includes("enotfound") ||
    m.includes("timeout")
  ) {
    return "network";
  }
  return "unknown";
}

const ANALYSIS_MESSAGES: Record<Kind, string> = {
  busy: "The AI assistant is handling a lot of requests right now. Give it a moment and tap Retry.",
  network: "Couldn't reach the AI assistant — check your connection and tap Retry.",
  unknown: "Couldn't analyze this lead right now. Tap Retry — it's usually a temporary hiccup.",
};

const CHAT_MESSAGES: Record<Kind, string> = {
  busy: "I'm getting a lot of requests right now — give it a few seconds and ask again.",
  network: "Couldn't reach the server just now — check your connection and try again.",
  unknown: "I couldn't get an answer that time. Try asking again in a moment.",
};

export function friendlyAnalysisError(raw: string): string {
  return ANALYSIS_MESSAGES[classify(raw)];
}

export function friendlyChatError(raw: string): string {
  return CHAT_MESSAGES[classify(raw)];
}
