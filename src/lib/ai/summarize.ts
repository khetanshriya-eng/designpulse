/**
 * The summarizer wraps the provider chain:
 *
 *   Groq openai/gpt-oss-120b  (primary — larger free tier)
 *        ↓ failure
 *   Gemini 2.5 Flash          (fallback)
 *
 * Any failure on the primary — rate-limit, 5xx, network timeout, even empty
 * completion — triggers the fallback. Permanent errors (e.g. invalid API key
 * on one provider) also fall back, because the operator's intent for the daily
 * pipeline is "don't crash; degrade gracefully".
 *
 * Result is normalised so the caller only sees a clean `{ summary, provider }`
 * shape or a `null` skip.
 */
import {
  callGemini,
  callGroq,
  type ProviderName,
  type ProviderResult,
} from "./providers";
import { SUMMARY_SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

export type SummarizeInput = {
  title: string;
  sourceName: string;
  rawContent: string | null;
};

export type SummarizeOutcome =
  | {
      ok: true;
      summary: string;
      provider: ProviderName;
      /** "skip" means the model returned the sentinel SKIP token — content too thin to summarize. */
      skipped: false;
    }
  | { ok: true; summary: null; provider: ProviderName; skipped: true }
  | {
      ok: false;
      summary: null;
      provider: null;
      attempts: Array<{
        provider: ProviderName;
        reason: string;
        message: string;
      }>;
    };

// Strip stray quotes, "Summary:" prefixes, and the SKIP sentinel.
function postProcess(raw: string): { text: string | null; skipped: boolean } {
  const trimmed = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(summary|sentence|tldr|tl;dr)[:\-—]\s*/i, "")
    .trim();
  if (/^skip\.?$/i.test(trimmed)) return { text: null, skipped: true };
  if (!trimmed) return { text: null, skipped: true };
  return { text: trimmed, skipped: false };
}

/** Providers whose daily quota is exhausted, for this serverless instance. */
const dailyQuotaGone = new Set<ProviderName>();

export async function summarizeArticle(
  input: SummarizeInput
): Promise<SummarizeOutcome> {
  const payload = {
    system: SUMMARY_SYSTEM_PROMPT,
    user: buildUserPrompt(input),
    temperature: 0.35,
    maxOutputTokens: 160,
  };

  const attempts: Array<{
    provider: ProviderName;
    reason: string;
    message: string;
  }> = [];

  // Order matters: Groq first (its free tier allows ~1,000 requests/day),
  // Gemini as fallback (its free tier for gemini-2.5-flash is now 20/day and
  // 5/min). We loop with an internal retry on `rate_limit` so a single article
  // gets a brief backoff before we give up entirely. A provider that reports
  // its DAILY quota is gone is skipped for the rest of this process — retrying
  // it can't succeed for hours and only burns the function's time budget.
  const callers = [
    { name: "groq" as const, call: () => callGroq(payload) },
    { name: "gemini" as const, call: () => callGemini(payload) },
  ].filter((c) => !dailyQuotaGone.has(c.name));

  // 3 sweeps: 0s, 8s, 20s. Total worst-case wait per article ≈ 28s.
  const RETRY_DELAYS_MS = [0, 8_000, 20_000];

  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));

    for (const step of callers) {
      const result: ProviderResult = await step.call();
      if (result.ok) {
        const { text, skipped } = postProcess(result.text);
        if (skipped) {
          return { ok: true, summary: null, provider: result.provider, skipped: true };
        }
        return {
          ok: true,
          summary: text!,
          provider: result.provider,
          skipped: false,
        };
      }
      attempts.push({
        provider: result.provider,
        reason: result.reason,
        message: result.message,
      });

      if (result.reason === "rate_limit" && /per ?day|daily/i.test(result.message)) {
        dailyQuotaGone.add(result.provider);
      }

      // On non-rate-limit failures, jump to the next provider immediately.
      // On rate_limit, also try the next provider once, then break out of
      // the inner loop so the outer loop's delay kicks in.
      if (result.reason !== "rate_limit") continue;
    }
    // If we got here, both providers failed this sweep. The outer loop's
    // next delay will give the rate-limit windows time to reset.
  }

  return { ok: false, summary: null, provider: null, attempts };
}
