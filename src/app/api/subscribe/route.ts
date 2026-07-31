/**
 * POST /api/subscribe
 *
 * Adds an email to the Buttondown list. Deploy-safe: if BUTTONDOWN_API_KEY
 * isn't set it returns a clear, non-crashing error. Lightly abuse-hardened
 * (honeypot + per-IP rate limit) like /api/feedback, since it's a public
 * unauthenticated POST.
 */
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { sendAdminAlert } from "@/lib/notify";

export const dynamic = "force-dynamic";
const log = logger("api.subscribe");

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
    "Each morning you'll get Designator: the day's best design and product",
    "stories, summarized so you can catch up in five minutes.",
    "",
    "Your first edition lands tomorrow. Today's is already live:",
    "https://designatorapp.com",
    "",
    "P.S. If this landed in Spam or Promotions, drag it to your Primary",
    "inbox so you don't miss editions.",
    "",
    "Aditya, Confused Designer",
  ].join("\n");

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1a1340;border:3px solid #1a1340;">
  <div style="background:#5b3df5;color:#d4ff3f;font-weight:800;font-size:26px;letter-spacing:-0.5px;padding:18px 24px;">designator</div>
  <div style="padding:24px;">
    <h1 style="font-size:20px;margin:0 0 12px;">You're in. <span style="color:#5b3df5;">✦</span></h1>
    <p style="font-size:15px;line-height:1.6;color:#5c5470;margin:0 0 14px;">Each morning you'll get the day's best design and product stories, summarized so you can catch up in five minutes.</p>
    <p style="font-size:15px;line-height:1.6;color:#5c5470;margin:0 0 20px;">Your first edition lands tomorrow. Today's is already live:</p>
    <a href="https://designatorapp.com" style="display:inline-block;background:#d4ff3f;color:#1a1340;font-weight:700;text-decoration:none;padding:10px 18px;border:2px solid #1a1340;">Read today&rsquo;s edition →</a>
    <p style="font-size:13px;line-height:1.6;color:#5c5470;margin:20px 0 0;">P.S. If this landed in Spam or Promotions, drag it to your Primary inbox so you don&rsquo;t miss editions.</p>
    <p style="font-size:13px;color:#9b93a8;margin:24px 0 0;">Aditya, Confused Designer</p>
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

  // Our own list (Supabase). Re-subscribing an opted-out address is just a
  // status flip — no external suppression wall (that was the Buttondown
  // problem this migration removed).
  const sb = createServiceClient();
  const now = new Date().toISOString();
  try {
    const { data: existing, error: readErr } = await sb
      .from("subscribers")
      .select("email, status")
      .eq("email", email)
      .maybeSingle();
    if (readErr) throw readErr;

    if (existing?.status === "active") {
      return Response.json({ success: true, message: "You're already subscribed." });
    }

    if (existing) {
      // Was unsubscribed → they're back. Filling the form is fresh consent, so
      // we honor it (the whole point of owning the list).
      const { error } = await sb
        .from("subscribers")
        .update({ status: "active", resubscribed_at: now, unsub_reason: null })
        .eq("email", email);
      if (error) throw error;
      await sendWelcomeEmail(email);
      return Response.json({
        success: true,
        message: "Welcome back — you're re-subscribed! First edition lands tomorrow morning.",
      });
    }

    // Brand new.
    const { error } = await sb
      .from("subscribers")
      .insert({ email, status: "active", source: "form" });
    if (error) throw error;
    await sendWelcomeEmail(email);
    return Response.json({
      success: true,
      message: "You're in — check your inbox. First edition lands tomorrow morning.",
    });
  } catch (err) {
    // Never tell the user they subscribed if the write failed. Log + alert so
    // it can't leak silently (the 2026-07-31 lesson).
    const msg = (err as Error).message;
    log.error("subscribe write failed", { error: msg });
    await sendAdminAlert({
      subject: "Designator: a signup FAILED",
      body: [
        `Email: ${email}`,
        `Error: ${msg}`,
        "",
        "Subscriber was NOT added — check the `subscribers` table (migration 0004).",
      ].join("\n"),
    }).catch(() => {});
    return Response.json(
      { error: "Something went wrong on our end — please try again in a moment." },
      { status: 502 }
    );
  }
}
