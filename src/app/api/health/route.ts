/**
 * GET /api/health
 *
 * Uncached health snapshot for the external watchdog (GitHub Actions, 03:15
 * UTC — see .github/workflows/digest-watchdog.yml).
 *
 * PUBLIC fields (safe — edition dates are already public via /api/archive, the
 * rest are booleans):
 *   editionFresh    — does an edition exist for the current IST day?
 *   digestSentToday — digest_log row for the IST day (null = migration 0003
 *                     not applied yet, status unknowable).
 *
 * AUTHED-ONLY field (Bearer CRON_SECRET) — a business metric, not public:
 *   subscribers     — total Buttondown subscribers (watch signups grow /
 *                     catch a drop). null when unauthenticated or unavailable.
 */
import type { NextRequest } from "next/server";
import { createPublicClient, createServiceClient } from "@/lib/db/client";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

const BUTTONDOWN_API = "https://api.buttondown.com/v1";

function istToday(): string {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const today = istToday();

  let latestEdition: string | null = null;
  try {
    const sb = createPublicClient();
    const { data } = await sb
      .from("editions")
      .select("edition_date")
      .order("edition_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestEdition = data?.edition_date ?? null;
  } catch {
    /* reported as null below */
  }

  let digestSentToday: boolean | null = null;
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("digest_log")
      .select("send_date")
      .eq("send_date", today)
      .maybeSingle();
    if (error) throw error;
    digestSentToday = !!data;
  } catch {
    digestSentToday = null; // table missing (migration 0003) or query failed
  }

  // Subscriber count only for authed callers — checkCronAuth returns null when
  // the Bearer matches, a Response otherwise (which we ignore here rather than
  // 401'ing, so the endpoint stays publicly readable for the basics).
  let subscribers: number | null = null;
  if (checkCronAuth(req) === null) {
    try {
      const apiKey = process.env.BUTTONDOWN_API_KEY;
      if (apiKey) {
        const res = await fetch(`${BUTTONDOWN_API}/subscribers`, {
          headers: { Authorization: `Token ${apiKey}` },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            count?: number;
            results?: unknown[];
          };
          subscribers =
            typeof data.count === "number"
              ? data.count
              : (data.results?.length ?? null);
        }
      }
    } catch {
      /* leave null */
    }
  }

  return Response.json(
    {
      now: new Date().toISOString(),
      istDate: today,
      latestEdition,
      editionFresh: latestEdition === today,
      digestSentToday,
      subscribers, // null unless authed
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
