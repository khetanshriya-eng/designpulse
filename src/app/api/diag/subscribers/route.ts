/**
 * GET /api/diag/subscribers  — TEMPORARY diagnostic (auth: Bearer CRON_SECRET).
 *
 * Incident 2026-07-31: "already subscribed" but no emails ever delivered, and
 * the digest's deliverable count is frozen at 4 across a Product Hunt launch.
 * This returns the Buttondown subscriber breakdown by `type` (COUNTS ONLY — no
 * email addresses, so no PII in logs) plus how many our digest filter would
 * actually treat as deliverable. Delete after diagnosis.
 */
import type { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
const BUTTONDOWN_API = "https://api.buttondown.com/v1";
// Mirror of the digest's deliverability filter (lib/newsletter.ts).
const UNDELIVERABLE = /unactiv|unsub|spam|trash|block|paused|churn|complain/i;

export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "BUTTONDOWN_API_KEY not set" }, { status: 503 });
  }

  const byType: Record<string, number> = {};
  let total = 0;
  let deliverable = 0;
  const fieldSamples = new Set<string>();
  let url: string | null = `${BUTTONDOWN_API}/subscribers`;

  for (let page = 0; url && page < 50; page++) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) {
      return Response.json(
        { error: `Buttondown ${res.status}`, detail: (await res.text()).slice(0, 300) },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      results?: Record<string, unknown>[];
      next?: string | null;
      count?: number;
    };
    for (const s of data.results ?? []) {
      total++;
      // Capture the raw field names Buttondown actually returns, once, so we
      // can see if the state lives in a field our filter isn't reading.
      if (fieldSamples.size === 0) Object.keys(s).forEach((k) => fieldSamples.add(k));
      const type = String(s.type ?? s.subscriber_type ?? s.subscription_status ?? "unknown");
      byType[type] = (byType[type] ?? 0) + 1;
      const email = String(s.email_address ?? s.email ?? "");
      if (email && !UNDELIVERABLE.test(type)) deliverable++;
    }
    url = data.next ?? null;
  }

  return Response.json({
    total,
    byType,
    deliverableByCurrentFilter: deliverable,
    subscriberObjectFields: [...fieldSamples].sort(),
  });
}
