/**
 * POST /api/subscribe
 *
 * Adds an email to the Buttondown list. Deploy-safe: if BUTTONDOWN_API_KEY
 * isn't set it returns a clear, non-crashing error. Lightly abuse-hardened
 * (honeypot + per-IP rate limit) like /api/feedback, since it's a public
 * unauthenticated POST.
 */
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
const log = logger("api.subscribe");

const BUTTONDOWN_API = "https://api.buttondown.com/v1";

// Per-IP rate limit: max 5 attempts / hour. In-memory (resets on cold start) —
// blunts scripted signup floods without a KV dependency.
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
  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function validEmail(email: string): boolean {
  // Deliberately loose — Buttondown does the authoritative validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Send a branded welcome via Resend (verified @designatorapp.com domain).
 * Buttondown doesn't email new API-added "regular" subscribers, so this is
 * what makes a signup feel acknowledged. Best-effort: logs on failure, never
 * throws into the signup response.
 */
async function sendWelcomeEmail(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.warn("welcome email skipped — no RESEND_API_KEY");
    return;
  }
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Designator <hello@designatorapp.com>";

  const text = [
    "You're in. ✦",
    "",
    "Each morning you'll get Designator — the day's 7 best design & product",
    "stories, summarized so you're current in five minutes.",
    "",
    "Your first edition lands tomorrow. Today's is already live:",
    "https://designatorapp.com",
    "",
    "— Aditya, Confused Designer",
  ].join("\n");

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1a1340;border:3px solid #1a1340;">
  <div style="background:#5b3df5;color:#d4ff3f;font-weight:800;font-size:26px;letter-spacing:-0.5px;padding:18px 24px;">designator</div>
  <div style="padding:24px;">
    <h1 style="font-size:20px;margin:0 0 12px;">You're in. <span style="color:#5b3df5;">✦</span></h1>
    <p style="font-size:15px;line-height:1.6;color:#5c5470;margin:0 0 14px;">Each morning you'll get the day's 7 best design &amp; product stories, summarized so you're current in five minutes.</p>
    <p style="font-size:15px;line-height:1.6;color:#5c5470;margin:0 0 20px;">Your first edition lands tomorrow. Today's is already live:</p>
    <a href="https://designatorapp.com" style="display:inline-block;background:#d4ff3f;color:#1a1340;font-weight:700;text-decoration:none;padding:10px 18px;border:2px solid #1a1340;">Read today&rsquo;s edition →</a>
    <p style="font-size:13px;color:#9b93a8;margin:24px 0 0;">— Aditya, Confused Designer</p>
  </div>
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "✦ Welcome to Designator",
        text,
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      log.warn("welcome email not delivered", { status: res.status, detail });
    } else {
      log.info("welcome email sent", { to: email });
    }
  } catch (err) {
    log.warn("welcome email threw", { error: (err as Error).message });
  }
}

export async function POST(req: NextRequest) {
  let body: { email?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot — invisible field; bots fill it. Pretend success, do nothing.
  if (body.website) {
    log.warn("subscribe honeypot tripped");
    return Response.json({ success: true, message: "You're in!" });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!validEmail(email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many attempts — try again later." },
      { status: 429 }
    );
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    log.warn("subscribe skipped — BUTTONDOWN_API_KEY not set");
    return Response.json(
      { error: "Subscriptions aren't set up yet — check back soon." },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${BUTTONDOWN_API}/subscribers`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_address: email, type: "regular" }),
    });

    if (res.status === 201) {
      // Best-effort welcome via Resend — never block/fail the signup on it.
      await sendWelcomeEmail(email);
      return Response.json({
        success: true,
        message: "You're in — check your inbox. First edition lands tomorrow morning.",
      });
    }

    const detail = (await res.text().catch(() => "")).toLowerCase();
    const diag = req.nextUrl.searchParams.get("diag") ? { detail } : {};

    // Already-subscribed is a success from the user's POV. Buttondown returns
    // 400 (or 409) for a duplicate; match on any of its wordings rather than a
    // single phrase, so this can't fall through to a generic error again.
    const isDuplicate =
      (res.status === 400 || res.status === 409) &&
      /already|exists|duplicate|collision|subscribed/.test(detail);
    if (isDuplicate) {
      return Response.json({
        success: true,
        message: "You're already subscribed.",
      });
    }

    // Buttondown also 400s an address it considers invalid/undeliverable
    // (e.g. reserved domains). Tell the user it's their email, not a glitch.
    const looksInvalid =
      res.status === 400 &&
      /invalid|deliverab|disposab|not a valid|valid email|bounce/.test(detail);
    if (looksInvalid) {
      return Response.json(
        { error: "That email looks invalid — double-check it?", code: res.status, ...diag },
        { status: 400 }
      );
    }

    // Anything else is a real failure. Surface the upstream status (not the
    // body) so the cause is diagnosable from the network tab without leaking
    // Buttondown internals.
    log.warn("buttondown subscribe error", { status: res.status, detail });
    return Response.json(
      { error: "Something went wrong. Please try again.", code: res.status, ...diag },
      { status: 400 }
    );
  } catch (err) {
    log.error("subscribe threw", { error: (err as Error).message });
    return Response.json(
      { error: "Couldn't subscribe right now. Please try again." },
      { status: 500 }
    );
  }
}
