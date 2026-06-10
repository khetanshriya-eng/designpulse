/**
 * POST /api/feedback
 *
 * Captures qualitative feedback (a 1–4 rating + optional comment) and emails it
 * to the feedback inbox via Resend — so users never leave the page or open a
 * mail client. Soft-degrades if Resend isn't configured (logs, returns ok).
 */
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
const log = logger("api.feedback");

const LABELS = ["", "Rough", "Meh", "Good", "Great"]; // index = rating 1–4

/**
 * Per-IP rate limit: max 5 submissions per hour. In-memory, so it resets on
 * cold starts and isn't shared across function instances — a deliberate
 * tradeoff: it blunts scripted bursts (the realistic abuse: burning the
 * Resend quota / flooding the inbox) without adding a KV dependency.
 */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  let body: { rating?: number; comment?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: the form field is invisible to humans; bots that fill it get a
  // fake success (don't tip them off) and nothing is sent.
  if (body.website) {
    log.warn("feedback honeypot tripped");
    return Response.json({ ok: true });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    log.warn("feedback rate limited", { ip });
    return Response.json(
      { error: "Too many submissions — try again later" },
      { status: 429 }
    );
  }

  const rating = Number(body.rating) || 0;
  const comment = String(body.comment ?? "").trim().slice(0, 2000);
  if ((rating < 1 || rating > 4) && !comment) {
    return Response.json({ error: "Empty feedback" }, { status: 400 });
  }

  // Always log the feedback so it's captured even if email delivery is blocked
  // (e.g. Resend sandbox can't reach the recipient yet). The user-facing
  // submit should never fail just because the email leg did.
  log.info("feedback", { rating, label: LABELS[rating] ?? "—", comment });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_EMAIL ?? "designatorapp@gmail.com";
  // Send from the verified designatorapp.com domain — delivers reliably to any
  // recipient (no more onboarding@resend.dev sandbox/spam limits).
  const from = process.env.RESEND_FROM_EMAIL ?? "Designator <feedback@designatorapp.com>";

  if (apiKey) {
    const text = [
      `Rating: ${rating ? `${rating}/4 (${LABELS[rating]})` : "—"}`,
      "",
      comment || "(no comment)",
      "",
      // Newlines stripped — never let a header value inject lines into the email.
      `From: ${(req.headers.get("user-agent") ?? "unknown").replace(/[\r\n]+/g, " ").slice(0, 300)}`,
    ].join("\n");
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          subject: `Designator feedback — ${rating ? LABELS[rating] : "comment"}`,
          text,
        }),
      });
      const detail = await res.text().catch(() => "");
      if (!res.ok) {
        // Don't fail the request — the feedback is already logged above.
        log.warn("feedback email NOT delivered", { to, status: res.status, detail });
      } else {
        // detail contains Resend's {"id": "..."} — check the Resend dashboard
        // → Emails for delivery status (delivered / bounced / spam).
        log.info("feedback email accepted by Resend", { to, detail });
      }
    } catch (err) {
      log.warn("feedback email threw", { to, error: (err as Error).message });
    }
  } else {
    log.warn("feedback email skipped — no RESEND_API_KEY");
  }

  // Always succeed for the user — feedback is captured regardless of email.
  return Response.json({ ok: true });
}
