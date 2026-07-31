/**
 * POST /api/diag/import-subscribers  — TEMPORARY (auth: Bearer CRON_SECRET).
 *
 * One-time migration: copy Buttondown's ACTIVE subscribers into our own
 * Supabase `subscribers` table (status='active', source='import'). Idempotent
 * (upsert on email). Run once after migration 0004, then delete this route.
 * Returns counts only — no email addresses (no PII in logs).
 */
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
const BUTTONDOWN_API = "https://api.buttondown.com/v1";
const ACTIVE = /regular|premium|gift/i;

async function handle(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) return Response.json({ error: "no BUTTONDOWN_API_KEY" }, { status: 503 });

  const emails: string[] = [];
  let scanned = 0;
  let url: string | null = `${BUTTONDOWN_API}/subscribers`;
  for (let page = 0; url && page < 50; page++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Token ${apiKey}` } });
    if (!res.ok) {
      return Response.json({ error: `Buttondown ${res.status}`, detail: (await res.text()).slice(0, 200) }, { status: 502 });
    }
    const data = (await res.json()) as { results?: Record<string, unknown>[]; next?: string | null };
    for (const s of data.results ?? []) {
      scanned++;
      const email = String(s.email_address ?? s.email ?? "").toLowerCase();
      const type = String(s.type ?? "");
      if (!ACTIVE.test(type)) continue;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      if (/@(example|test)\.(com|org|net)$/.test(email)) continue; // drop test litter
      emails.push(email);
    }
    url = data.next ?? null;
  }

  const unique = [...new Set(emails)];
  if (unique.length === 0) {
    return Response.json({ scanned, active: 0, imported: 0, note: "nothing to import" });
  }

  const svc = createServiceClient();
  const { error } = await svc.from("subscribers").upsert(
    unique.map((email) => ({ email, status: "active" as const, source: "import" })),
    { onConflict: "email", ignoreDuplicates: true } // never clobber an existing (e.g. unsubscribed) row
  );
  if (error) {
    return Response.json({ error: "supabase upsert failed", detail: error.message }, { status: 500 });
  }
  return Response.json({ scanned, active: unique.length, imported: unique.length });
}

export const GET = handle;
export const POST = handle;
