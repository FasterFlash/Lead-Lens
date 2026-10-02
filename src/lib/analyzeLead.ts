import { Type } from "@google/genai";
import { getGeminiClient, MODELS, FALLBACK_MODELS } from "./gemini";
import type { AIAnalysis, LeadFormInput, PriorityTag } from "./types";

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        "One sentence, scannable in under 2 seconds. No filler, no restating the form fields verbatim.",
    },
    intent: {
      type: Type.STRING,
      description:
        "Buying for self vs investment, serious vs browsing, resale vs new-launch interest — inferred from the message, not guessed generically.",
    },
    keySignals: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "The 3-5 tags that MOST DRIVE the decision on this specific lead — not a dump of everything noticed. " +
        "Short noun phrases (2-4 words each), freely worded by you, specific to what's actually in the message " +
        "(e.g. 'Vastu-sensitive', 'Spouse approval needed', 'Comparing ECR project', 'Negotiable up to 1.2Cr', " +
        "'Casual browsing — not committed', 'Wants RERA/possession proof'). Order them strongest-signal-first: " +
        "the tag that most changes how the salesperson should approach the call goes first. If there are more " +
        "than 5 candidate signals, cut the weaker ones — do not pad to 5. If there are fewer than 3 genuine " +
        "signals, return fewer rather than inventing filler.",
    },
    keyRequirements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Concrete requirements pulled from the free-text message, INCLUDING anything that adds to or conflicts with the structured fields (e.g. message says a higher budget than the budget field).",
    },
    objections: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Hesitations, blockers, competing options, or undecided co-buyers mentioned or implied. Empty array if genuinely none present — do not invent one.",
    },
    score: {
      type: Type.NUMBER,
      description:
        "0-100 priority score. Must be justified by concrete facts (budget-requirement fit, timeline, specificity of the message), never by urgency language alone.",
    },
    priorityTag: {
      type: Type.STRING,
      enum: ["hot", "warm", "cold"],
    },
    scoreReason: {
      type: Type.STRING,
      description:
        "One or two sentences explaining the score using THIS lead's specific facts. A human must be able to verify it by re-reading the message.",
    },
    recommendedAction: {
      type: Type.STRING,
      description:
        "Short, concrete next step: e.g. 'Call now', 'Call today', 'Nurture — follow up in a week', 'Deprioritize — low budget/requirement fit'.",
    },
    suggestedResponse: {
      type: Type.STRING,
      description:
        "A first response the salesperson could send almost as-is, grounded in this lead's specific budget/requirement/objection. Must not be generic enough to apply to a different lead unchanged.",
    },
    flags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Data-quality flags: e.g. 'budget in message contradicts budget field', 'message has no usable information — scored conservatively', 'requirement unrealistic for stated budget'. Empty array if none.",
    },
  },
  required: [
    "summary",
    "intent",
    "keySignals",
    "keyRequirements",
    "objections",
    "score",
    "priorityTag",
    "scoreReason",
    "recommendedAction",
    "suggestedResponse",
    "flags",
  ],
};

const SYSTEM_INSTRUCTION = `You are a lead-qualification assistant for a real-estate salesperson. \
You analyze ONE inbound lead and produce a structured, honest assessment the salesperson will act on \
within seconds, often while about to make a phone call. Trust is the entire point: never state \
something as fact that isn't supported by the lead's own data.

Rules you must follow:
1. Ground everything in the structured fields AND the free-text message together. If they conflict \
   (e.g. stated budget vs. a number mentioned in the message), surface it as a flag — do not silently \
   pick one and hide the discrepancy.
2. Do not let urgency language alone ("URGENT", "need immediately") inflate the score if the \
   structured facts (budget, requirement, timeline) don't support it. A lead must earn a high score \
   through genuine fit and signal, not through capitalized words.
3. If the free-text message is empty, garbage, or contains no usable information, do not invent intent \
   or objections. Say so in a flag, score conservatively, and keep keyRequirements/objections minimal \
   or empty.
4. This is not India-only. Do not assume a currency, a legal framework (e.g. do not assume RERA \
   applies), or a specific country. Work with whatever location/budget format is given.
5. The suggestedResponse must be specific enough that it could not be copy-pasted unchanged onto a \
   different lead. If you can't make it specific, say less rather than generating filler.
6. Keep the summary to one sentence. The salesperson has seconds, not minutes.
7. keySignals is a ranked shortlist, not a transcript recap. Pick the 3-5 things that most change HOW \
   the salesperson should run the call (who else is involved in the decision, what they're sensitive about, \
   what they're comparing against, how negotiable they are, how committed they actually are) — not every \
   detail you noticed. Rank by decision impact, strongest first. Never pad with generic filler to hit a count.`;

function buildPrompt(input: LeadFormInput): string {
  return `Analyze this real-estate lead.

Name: ${input.name || "(not provided)"}
Location requested: ${input.location || "(not provided)"}
Property requirement: ${input.requirement || "(not provided)"}
Stated budget: ${input.budget || "(not provided)"}
Buying timeline: ${input.timeline || "(not provided)"}

Customer message (raw, verbatim — this may be messy, translated, or terse):
"""
${input.message || "(no message provided)"}
"""`;
}

function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tagFromScore(score: number): PriorityTag {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

async function callModel(
  ai: ReturnType<typeof getGeminiClient>,
  model: string,
  input: LeadFormInput
) {
  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(input),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema,
      temperature: 0.3,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error(`Empty response from Gemini (${model}) during lead analysis.`);
  }

  try {
    return JSON.parse(text) as Omit<AIAnalysis, "analyzedAt" | "analyzedByModel">;
  } catch {
    throw new Error(`Gemini (${model}) returned non-JSON output for lead analysis.`);
  }
}

export async function analyzeLead(input: LeadFormInput): Promise<AIAnalysis> {
  const ai = getGeminiClient();

  let parsed: Omit<AIAnalysis, "analyzedAt" | "analyzedByModel">;
  let modelUsed: string;

  try {
    parsed = await callModel(ai, MODELS.analysis, input);
    modelUsed = MODELS.analysis;
  } catch (primaryErr) {
    // Single fallback: a different model often has a separate free-tier
    // quota bucket, so this is a real second chance, not just a retry of
    // the same limit. Not a cascade — one fallback, then give up honestly.
    try {
      parsed = await callModel(ai, FALLBACK_MODELS.analysis, input);
      modelUsed = `${FALLBACK_MODELS.analysis} (fallback)`;
    } catch (fallbackErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(
        `Primary model failed: ${primaryMsg} | Fallback model also failed: ${fallbackMsg}`
      );
    }
  }

  const score = clampScore(parsed.score);

  return {
    ...parsed,
    score,
    // Trust the model's tag if present and consistent; otherwise derive it,
    // so a schema-following-but-odd response still lands on a sane label.
    priorityTag: parsed.priorityTag ?? tagFromScore(score),
    analyzedAt: new Date().toISOString(),
    analyzedByModel: modelUsed,
  };
}
