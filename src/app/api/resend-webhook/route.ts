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
 * Permanent bounces and complaints unsubscribe at once. Transient bounces
 * (server unreachable, mailbox full) are counted in subscribers.soft_bounces
 * and reset by a delivered email (email.delivered); SOFT_BOUNCE_LIMIT in a
 * row unsubscribes with reason 'soft-bounced'. Needed because an address
 * whose server never accepts mail is reported as *transient* every day, and
 * Resend never suppresses those on its own (seen 2026-11). Requires
 * migration 0005; without the column, transient bounces are logged only.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger("api.resend-webhook");
const TOLERANCE_S = 5 * 60; // reject replays older than 5 minutes
const SOFT_BOUNCE_LIMIT = 3; // consecutive transient bounces before we stop

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

type Service = ReturnType<typeof createServiceClient>;

/** Increment soft_bounces; unsubscribe addresses that reach the limit. */
async function countSoftBounce(sb: Service, emails: string[]) {
  const { data, error } = await sb
    .from("subscribers")
    .select("email, soft_bounces")
    .in("email", emails)
    .eq("status", "active");
  if (error) {
    // Most likely migration 0005 not applied yet: log, don't make Resend retry.
    log.warn("soft-bounce lookup failed", { error: error.message });
    return { ok: true, ignored: "soft-bounce tracking unavailable" };
  }
  let suppressed = 0;
  for (const row of data ?? []) {
    const n = ((row.soft_bounces as number | null) ?? 0) + 1;
    const patch =
      n >= SOFT_BOUNCE_LIMIT
        ? { soft_bounces: n, status: "unsubscribed" as const, unsubscribed_at: new Date().toISOString(), unsub_reason: "soft-bounced" }
        : { soft_bounces: n };
    const { error: upErr } = await sb.from("subscribers").update(patch).eq("email", row.email);
    if (upErr) log.warn("soft-bounce update failed", { error: upErr.message });
    else if (n >= SOFT_BOUNCE_LIMIT) suppressed++;
  }
  log.info("soft bounce counted", { count: data?.length ?? 0, suppressed });
  return { ok: true, softBounced: data?.length ?? 0, suppressed };
}

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

  const to = event.data?.to;
  const emails = (Array.isArray(to) ? to : to ? [to] : [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return Response.json({ ok: true, ignored: "no recipient" });

  const sb = createServiceClient();
  const bounceType = (event.data?.bounce?.type ?? "").toLowerCase();

  // Delivered: the address works again, so any soft-bounce streak is over.
  if (event.type === "email.delivered") {
    const { error } = await sb
      .from("subscribers")
      .update({ soft_bounces: 0 })
      .in("email", emails)
      .gt("soft_bounces", 0);
    if (error) log.warn("soft-bounce reset failed", { error: error.message });
    return Response.json({ ok: true });
  }

  if (event.type === "email.bounced" && bounceType === "transient") {
    return Response.json(await countSoftBounce(sb, emails));
  }

  let reason: string | null = null;
  if (event.type === "email.complained") reason = "complained";
  if (event.type === "email.bounced") reason = "bounced";
  if (!reason) return Response.json({ ok: true, ignored: event.type ?? "unknown" });
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
