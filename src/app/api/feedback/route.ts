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

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_EMAIL ?? "designatorapp@gmail.com";
  const from = process.env.RESEND_FROM_EMAIL ?? "Designator <onboarding@resend.dev>";

  if (!apiKey) {
    log.warn("feedback received but RESEND_API_KEY unset", { rating, hasComment: !!comment });
    return Response.json({ ok: true, emailed: false });
  }

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
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      log.error("feedback email failed", { status: res.status, detail });
      return Response.json({ error: "Send failed" }, { status: 502 });
    }
    log.info("feedback emailed", { rating });
    return Response.json({ ok: true, emailed: true });
  } catch (err) {
    log.error("feedback threw", { error: (err as Error).message });
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
