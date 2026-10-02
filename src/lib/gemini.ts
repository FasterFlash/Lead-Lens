import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

/** Lazily construct the Gemini client so a missing API key fails at
 *  call-time with a clear error, not at import-time / build-time. */
export function getGeminiClient(): GoogleGenAI {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (local dev) or your " +
        "deployment's environment variables (Vercel project settings)."
    );
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

// Split by task, cheapest model that's good enough for each job —
// don't burn free-tier quota on a heavy model for a light job.
export const MODELS = {
  // Structured analysis: needs to follow a schema and reason a little. Flash is enough.
  analysis: process.env.GEMINI_MODEL_ANALYSIS || "gemini-3.8-flash",
  // Conversational follow-ups: deliberately the OPPOSITE primary choice from
  // analysis (see FALLBACK_MODELS below) — the realistic usage pattern is
  // "analyze a lead, then immediately ask it questions," which would hammer
  // the same model's quota twice in a row if both features picked the same
  // model first.
  chat: process.env.GEMINI_MODEL_CHAT || "gemini-3.5-flash-lite",
};

// One fallback model each, tried only if the primary fails (overload,
// quota, transient 5xx). Deliberately a SINGLE fallback, not a cascade
// across providers — fewer moving parts to debug, and this is a
// quota/availability hedge, not a resilience architecture.
//
// Analysis needs real reasoning (structured output, judging priority), so
// its fallback is still a full "flash" model, not a lite one — 3.7-flash is
// a smaller step down from 3.8-flash than 3.5-flash-lite was. Chat is a
// lighter task and 3.5-flash-lite is already more than enough, so its
// fallback is another lite model (3.1-flash-lite) rather than a heavier one.
// Net effect: analysis and chat now draw from four entirely separate
// models with no overlap, so neither feature's primary+fallback pair
// competes with the other's quota at all.
export const FALLBACK_MODELS = {
  analysis: process.env.GEMINI_MODEL_ANALYSIS_FALLBACK || "gemini-3.7-flash",
  chat: process.env.GEMINI_MODEL_CHAT_FALLBACK || "gemini-3.1-flash-lite",
};
