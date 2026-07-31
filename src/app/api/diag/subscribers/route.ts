/**
 * GET /api/diag/subscribers  — TEMPORARY diagnostic (auth: Bearer CRON_SECRET).
 *
 * Incident 2026-07-31: "already subscribed" but no delivery; Buttondown shows
 * only 2 subscribers after a Product Hunt launch. Modes:
 *   (default)      → counts by type + raw subscriber field names (no PII).
 *   ?email=<addr>  → look up ONE address's state (its own owner is asking).
 *   ?probe=1       → replay a REAL signup (same payload as the subscribe
 *                    route) with a throwaway address, return Buttondown's raw
 *                    status + body, then delete the probe. This is the exact
 *                    thing a visitor hits. Delete this route after diagnosis.
 */
import type { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
const BUTTONDOWN_API = "https://api.buttondown.com/v1";
const UNDELIVERABLE = /unactiv|unsub|spam|trash|block|paused|churn|complain/i;

export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) return Response.json({ error: "no BUTTONDOWN_API_KEY" }, { status: 503 });
  const auth = { Authorization: `Token ${apiKey}` };
  const params = new URL(req.url).searchParams;

  // ── Single-address lookup ──
  const email = params.get("email");
  if (email) {
    const res = await fetch(
      `${BUTTONDOWN_API}/subscribers/${encodeURIComponent(email.toLowerCase())}`,
      { headers: auth }
    );
    if (res.status === 404) return Response.json({ email, found: false });
    if (!res.ok) {
      return Response.json({ email, error: `Buttondown ${res.status}`, detail: (await res.text()).slice(0, 300) });
    }
    const s = (await res.json()) as Record<string, unknown>;
    return Response.json({
      email,
      found: true,
      type: s.type,
      creation_date: s.creation_date,
      source: s.source,
      firewall_reasons: s.firewall_reasons,
      undeliverability_reason: s.undeliverability_reason,
      bounce_reason: s.bounce_reason,
      unsubscription_reason: s.unsubscription_reason,
    });
  }

  // ── Replay a real signup ──
  // ?probe=1            → random throwaway email (auto-deleted).
  // ?probe=1&as=<email> → that exact email, kept if created (so it also
  //                       recovers a real user), raw Buttondown body returned.
  if (params.get("probe")) {
    const as = params.get("as");
    const probe = as ? as.toLowerCase() : `phtest+${Date.now()}@gmail.com`;
    const res = await fetch(`${BUTTONDOWN_API}/subscribers`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json", "X-Buttondown-Bypass-Firewall": "true" },
      body: JSON.stringify({ email_address: probe, type: "regular" }),
    });
    const body = (await res.text()).slice(0, 800);
    // Auto-delete only the throwaway probe, never a real address.
    if (res.status === 201 && !as) {
      await fetch(`${BUTTONDOWN_API}/subscribers/${encodeURIComponent(probe)}`, {
        method: "DELETE",
        headers: auth,
      }).catch(() => {});
    }
    return Response.json({ probeEmail: probe, status: res.status, ok: res.ok, body });
  }

  // ── Default: aggregate breakdown ──
  const byType: Record<string, number> = {};
  let total = 0, deliverable = 0;
  let url: string | null = `${BUTTONDOWN_API}/subscribers`;
  for (let page = 0; url && page < 50; page++) {
    const res: Response = await fetch(url, { headers: auth });
    if (!res.ok) return Response.json({ error: `Buttondown ${res.status}`, detail: (await res.text()).slice(0, 300) }, { status: 502 });
    const data = (await res.json()) as { results?: Record<string, unknown>[]; next?: string | null };
    for (const s of data.results ?? []) {
      total++;
      const type = String(s.type ?? "unknown");
      byType[type] = (byType[type] ?? 0) + 1;
      if (s.email_address && !UNDELIVERABLE.test(type)) deliverable++;
    }
    url = data.next ?? null;
  }
  return Response.json({ total, byType, deliverableByCurrentFilter: deliverable });
}
