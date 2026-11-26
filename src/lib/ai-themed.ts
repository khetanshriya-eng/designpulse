/**
 * Is a headline about AI itself (models, assistants, agents, AI companies)?
 * Used to keep the page a design briefing: AI-themed stories arrive through
 * design sources too, and a first visit read the site as AI news when they
 * filled every section (2026-11-26 audit). Deliberately headline-only and
 * conservative: "design systems" or "AI-assisted research" in a UX piece
 * still count, which is the point: they're capped, not hidden.
 */
const AI_TERMS =
  /\b(ai|a\.i\.|agi|llms?|gpt[-\s]?\d*|chatgpt|claude|gemini|copilot|openai|anthropic|deepmind|mistral|llama|agents?|agentic|genai|machine learning|neural)\b/i;

export function isAiThemed(title: string): boolean {
  return AI_TERMS.test(title);
}

/** YouTube Shorts and other clips: fine in lists, never the lead story. */
export function isShortClip(url: string): boolean {
  return /youtube\.com\/shorts\//i.test(url);
}
