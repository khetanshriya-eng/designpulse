/**
 * Provider-specific HTTP clients for chat-style completions.
 *
 * Both return a uniform `ProviderResult` so the fallback chain in
 * `summarize.ts` can decide what to do without knowing transport details.
 *
 * Failure taxonomy:
 *  - "rate_limit"  → HTTP 429 or provider-specific "quota exceeded" payload
 *  - "transient"   → HTTP 5xx, network timeouts, aborted fetches
 *  - "permanent"   → HTTP 4xx (other than 429), bad API key, malformed response
 *
 * The summarizer falls back from Gemini → Groq on rate_limit AND transient.
 * Permanent errors still trigger fallback (we'd rather degrade than crash),
 * but they're surfaced to the user in logs so they can fix the root cause.
 */

export type ProviderName = "gemini" | "groq";

export type ProviderSuccess = {
  ok: true;
  provider: ProviderName;
  text: string;
  /** Optional usage block, when the provider returns one. */
  usage?: { input?: number; output?: number };
};

export type ProviderFailureReason = "rate_limit" | "transient" | "permanent";

export type ProviderFailure = {
  ok: false;
  provider: ProviderName;
  reason: ProviderFailureReason;
  message: string;
  status?: number;
};

export type ProviderResult = ProviderSuccess | ProviderFailure;

export type CompletionInput = {
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;

function classifyStatus(status: number): ProviderFailureReason {
  if (status === 429) return "rate_limit";
  if (status >= 500) return "transient";
  return "permanent";
}

async function withTimeout<T>(
  promise: () => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await promise();
  } finally {
    clearTimeout(t);
  }
}

// ─── Gemini ──────────────────────────────────────────────────────────────
//
// We use the REST endpoint directly to avoid pulling in @google/generative-ai.
// Model: gemini-2.5-flash. The `systemInstruction` field carries the system
// prompt; the `contents` array holds the user message.

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { code?: number; message?: string; status?: string };
};

export async function callGemini(
  input: CompletionInput
): Promise<ProviderResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      ok: false,
      provider: "gemini",
      reason: "permanent",
      message: "GEMINI_API_KEY is not set",
    };
  }

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    key
  )}`;

  const body = {
    systemInstruction: { parts: [{ text: input.system }] },
    contents: [{ role: "user", parts: [{ text: input.user }] }],
    generationConfig: {
      temperature: input.temperature ?? 0.4,
      maxOutputTokens: input.maxOutputTokens ?? 200,
      // Gemini 2.5 Flash spends "thinking" tokens against maxOutputTokens
      // before emitting any output. For one-sentence summaries we don't want
      // any silent reasoning budget — set it to 0 so the whole quota is
      // available for the actual sentence.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  let res: Response;
  try {
    res = await withTimeout(
      () =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      DEFAULT_TIMEOUT_MS
    );
  } catch (err) {
    return {
      ok: false,
      provider: "gemini",
      reason: "transient",
      message: `network: ${(err as Error).message}`,
    };
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const payload = (await res.json()) as GeminiResponse;
      if (payload?.error?.message) message = payload.error.message;
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      provider: "gemini",
      reason: classifyStatus(res.status),
      status: res.status,
      message,
    };
  }

  let payload: GeminiResponse;
  try {
    payload = (await res.json()) as GeminiResponse;
  } catch (err) {
    return {
      ok: false,
      provider: "gemini",
      reason: "transient",
      message: `parse: ${(err as Error).message}`,
    };
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    // Empty completions usually mean a safety filter or model glitch — treat
    // as transient so the caller falls back to Groq.
    return {
      ok: false,
      provider: "gemini",
      reason: "transient",
      message: `empty response (finishReason=${payload.candidates?.[0]?.finishReason ?? "?"})`,
    };
  }

  return {
    ok: true,
    provider: "gemini",
    text,
    usage: {
      input: payload.usageMetadata?.promptTokenCount,
      output: payload.usageMetadata?.candidatesTokenCount,
    },
  };
}

// ─── Groq ────────────────────────────────────────────────────────────────
//
// Groq exposes an OpenAI-compatible Chat Completions API. We use
// llama-3.3-70b-versatile as the fallback model — fast, capable, and
// available on Groq's free tier.

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type GroqResponse = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string; code?: string };
};

export async function callGroq(
  input: CompletionInput
): Promise<ProviderResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      ok: false,
      provider: "groq",
      reason: "permanent",
      message: "GROQ_API_KEY is not set",
    };
  }

  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: input.temperature ?? 0.4,
    max_tokens: input.maxOutputTokens ?? 200,
  };

  let res: Response;
  try {
    res = await withTimeout(
      () =>
        fetch(GROQ_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
        }),
      DEFAULT_TIMEOUT_MS
    );
  } catch (err) {
    return {
      ok: false,
      provider: "groq",
      reason: "transient",
      message: `network: ${(err as Error).message}`,
    };
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const payload = (await res.json()) as GroqResponse;
      if (payload?.error?.message) message = payload.error.message;
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      provider: "groq",
      reason: classifyStatus(res.status),
      status: res.status,
      message,
    };
  }

  let payload: GroqResponse;
  try {
    payload = (await res.json()) as GroqResponse;
  } catch (err) {
    return {
      ok: false,
      provider: "groq",
      reason: "transient",
      message: `parse: ${(err as Error).message}`,
    };
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return {
      ok: false,
      provider: "groq",
      reason: "transient",
      message: `empty response (finish_reason=${payload.choices?.[0]?.finish_reason ?? "?"})`,
    };
  }

  return {
    ok: true,
    provider: "groq",
    text,
    usage: {
      input: payload.usage?.prompt_tokens,
      output: payload.usage?.completion_tokens,
    },
  };
}
