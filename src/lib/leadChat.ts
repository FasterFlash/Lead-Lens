import { getGeminiClient, MODELS, FALLBACK_MODELS } from "./gemini";
import type { ChatMessage, Lead } from "./types";

const SYSTEM_INSTRUCTION = `You are a call-prep assistant helping a real-estate salesperson who is about \
to call, or is actively on a call with, ONE specific lead. You are not a general-purpose assistant.

Ground rules, no exceptions:
1. Answer ONLY using the lead data provided below (structured fields, raw message, prior AI analysis, \
   and contact history). If the answer to the salesperson's question is not supported by that data, say \
   plainly "I don't have that information from this lead" — do NOT invent a number, a legal detail, a \
   possession date, a price, or anything else not present in the data. This is the single most important \
   rule. A wrong invented answer said live on a phone call damages trust with a real customer.
2. Stay scoped to this one lead. If asked about a different lead, about something unrelated to this \
   lead or this call (general knowledge, other tasks, writing unrelated content), say you're scoped to \
   helping with this specific lead and redirect back to it.
3. Be concise and practically useful — the salesperson may be reading your answer in the seconds before \
   or during a live call. No preamble, no hedging paragraphs. Give the actual words or framing to use \
   when that's what's asked.
4. Do not assume Indian-specific legal/financial frameworks (RERA, lakhs/crores) unless the lead's own \
   data uses them. Match the lead's own currency and terms.`;

function buildLeadContextBlock(lead: Lead): string {
  const history = lead.contactLogs
    .map(
      (log, i) =>
        `  ${i + 1}. [${log.timestamp}] outcome=${log.outcome}${
          log.notes ? `, notes="${log.notes}"` : ""
        }${log.nextFollowUpDate ? `, next follow-up=${log.nextFollowUpDate}` : ""}`
    )
    .join("\n");

  return `LEAD DATA (this is the only ground truth — do not go beyond it):

Name: ${lead.name}
Location requested: ${lead.location || "(not provided)"}
Requirement: ${lead.requirement || "(not provided)"}
Stated budget: ${lead.budget || "(not provided)"}
Timeline: ${lead.timeline || "(not provided)"}

Raw customer message:
"""
${lead.message || "(none provided)"}
"""

${
  lead.analysis
    ? `AI analysis already produced for this lead:
- Summary: ${lead.analysis.summary}
- Intent: ${lead.analysis.intent}
- Key requirements: ${lead.analysis.keyRequirements.join("; ") || "(none)"}
- Objections: ${lead.analysis.objections.join("; ") || "(none)"}
- Score: ${lead.analysis.score} (${lead.analysis.priorityTag})
- Score reason: ${lead.analysis.scoreReason}
- Recommended action: ${lead.analysis.recommendedAction}
- Flags: ${lead.analysis.flags.join("; ") || "(none)"}`
    : "AI analysis: not yet available for this lead."
}

Contact history (${lead.contactLogs.length} attempt(s)):
${history || "  (no contact attempts logged yet)"}`;
}

async function callChatModel(
  ai: ReturnType<typeof getGeminiClient>,
  model: string,
  prompt: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error(`Empty response from Gemini (${model}) during lead chat.`);
  }
  return text.trim();
}

export async function askLeadChat(
  lead: Lead,
  history: ChatMessage[],
  question: string
): Promise<string> {
  const ai = getGeminiClient();

  const contextBlock = buildLeadContextBlock(lead);

  // Re-feed the full lead context plus prior turns EVERY call. Never rely
  // on the model's own memory of a long-running session — that's how
  // grounding erodes turn by turn.
  const priorTurns = history
    .map((m) => `${m.role === "user" ? "Salesperson" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `${contextBlock}

${priorTurns ? `Prior conversation in this session:\n${priorTurns}\n` : ""}
Salesperson's question: ${question}`;

  // Same single-fallback pattern as lead analysis: one retry on a
  // different model if the primary is overloaded/rate-limited, then give
  // up honestly rather than cascading further.
  try {
    return await callChatModel(ai, MODELS.chat, prompt);
  } catch (primaryErr) {
    try {
      return await callChatModel(ai, FALLBACK_MODELS.chat, prompt);
    } catch (fallbackErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(
        `Primary model failed: ${primaryMsg} | Fallback model also failed: ${fallbackMsg}`
      );
    }
  }
}
