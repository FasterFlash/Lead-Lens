// Zero-cost, zero-API fallback tagging for leads that haven't been AI-analyzed
// yet (status "not_started" or "failed"). This is deliberately dumb — plain
// keyword matching, no model call — so the home-page row never has to burn
// quota just to render a preview while waiting for the user to click "Analyze".
// Real tagging (keySignals from the AI analysis) always takes over once a
// lead is actually analyzed; this only fills the gap before that.

interface Rule {
  tag: string;
  patterns: RegExp[];
}

// Order = priority when multiple rules match. Keep each tag short (2-4 words)
// to match the visual language of the AI-generated keySignals pills.
const RULES: Rule[] = [
  { tag: "Vastu-sensitive", patterns: [/vastu/i] },
  { tag: "Spouse/family involved", patterns: [/\bwife\b/i, /\bhusband\b/i, /\bparents?\b/i, /\bmother\b/i, /\bfather\b/i, /approval/i] },
  { tag: "Comparing other projects", patterns: [/also (looking|evaluating|checking|considering)/i, /other (project|site|property|builder)/i, /\becr\b/i] },
  { tag: "Negotiation in play", patterns: [/negotiabl/i, /can go (up to|upto)/i, /\bnego\b/i, /best price/i, /discount/i] },
  { tag: "Casual browsing", patterns: [/just (exploring|browsing|looking)/i, /not committed/i, /no rush/i, /just enquiring/i] },
  { tag: "Compliance-conscious", patterns: [/\brera\b/i, /possession date/i, /title deed/i, /legal (clearance|check)/i] },
  { tag: "Urgent timeline", patterns: [/immediate/i, /urgent/i, /asap/i, /within a (week|month)/i] },
  { tag: "Price-sensitive", patterns: [/budget/i, /affordable/i, /cheaper/i, /loan/i, /emi/i] },
  { tag: "Site visit done", patterns: [/visited/i, /site visit/i, /came to see/i] },
  { tag: "Specific unit/layout ask", patterns: [/corner (plot|unit)/i, /\bbhk\b/i, /facing/i, /floor plan/i, /layout/i] },
];

/** Returns up to `max` short tags pulled from raw keyword matches, in rule
 *  priority order. Empty array if the message has nothing to match on —
 *  this never invents a tag the way an AI-free summary of empty text would. */
export function extractKeywordTags(message: string, max = 4): string[] {
  if (!message || !message.trim()) return [];
  const hits: string[] = [];
  for (const rule of RULES) {
    if (hits.length >= max) break;
    if (rule.patterns.some((p) => p.test(message))) {
      hits.push(rule.tag);
    }
  }
  return hits;
}
