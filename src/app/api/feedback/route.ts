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

export async function POST(req: NextRequest) {
  let body: { rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
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
      `From: ${req.headers.get("user-agent") ?? "unknown"}`,
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
