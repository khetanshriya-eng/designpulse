/**
 * POST /api/resend-webhook
 *
 * Keeps the subscriber list clean: Resend calls this when an email hard-
 * bounces or the recipient marks it as spam, and we stop mailing that address
 * (status → unsubscribed, with the reason). Mailing dead or complaining
 * addresses is what gets a sending domain throttled or spam-foldered.
 *
 * Auth: Resend signs webhooks the Svix way. We verify the signature with
 * RESEND_WEBHOOK_SECRET (the "whsec_…" signing secret shown when the webhook
 * is created in Resend → Webhooks). Unset secret → 503, so an unconfigured
 * endpoint can never be used to unsubscribe people.
 *
 * Only permanent bounces count; transient ones (full inbox, greylisting)
 * are ignored so a temporary problem never drops a real reader.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger("api.resend-webhook");
const TOLERANCE_S = 5 * 60; // reject replays older than 5 minutes

function verify(secret: string, id: string, ts: string, body: string, header: string): boolean {
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > TOLERANCE_S) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  // Header is a space-separated list like "v1,<base64> v1,<base64>".
  return header.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

type ResendEvent = {
  type?: string;
  data?: { to?: string[] | string; bounce?: { type?: string; subType?: string } };
};

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "RESEND_WEBHOOK_SECRET is not configured" }, { status: 503 });
  }

  const body = await req.text();
  const ok = verify(
    secret,
    req.headers.get("svix-id") ?? "",
    req.headers.get("svix-timestamp") ?? "",
    body,
    req.headers.get("svix-signature") ?? ""
  );
  if (!ok) return Response.json({ error: "Invalid signature" }, { status: 401 });

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }

  let reason: string | null = null;
  if (event.type === "email.complained") reason = "complained";
  if (event.type === "email.bounced") {
    const bounceType = (event.data?.bounce?.type ?? "").toLowerCase();
    reason = bounceType === "transient" ? null : "bounced";
  }
  if (!reason) return Response.json({ ok: true, ignored: event.type ?? "unknown" });

  const to = event.data?.to;
  const emails = (Array.isArray(to) ? to : to ? [to] : [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return Response.json({ ok: true, ignored: "no recipient" });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString(), unsub_reason: reason })
    .in("email", emails)
    .eq("status", "active")
    .select("email");
  if (error) {
    log.error("suppress failed", { reason, error: error.message });
    // 500 makes Resend retry later.
    return Response.json({ error: "db" }, { status: 500 });
  }
  log.info("subscriber suppressed", { reason, count: data?.length ?? 0 });
  return Response.json({ ok: true, suppressed: data?.length ?? 0 });
}
