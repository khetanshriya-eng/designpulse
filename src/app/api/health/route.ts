/**
 * GET /api/health
 *
 * Public, uncached health snapshot for the external watchdog (GitHub Actions,
 * 03:15 UTC — see .github/workflows/digest-watchdog.yml). Exposes nothing
 * secret: edition dates are already public via /api/archive, and the digest
 * status is a boolean.
 *
 *   editionFresh    — does an edition exist for the current IST day?
 *   digestSentToday — digest_log row for the IST day (null = migration 0003
 *                     not applied yet, status unknowable).
 */
import { createPublicClient, createServiceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

function istToday(): string {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export async function GET() {
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

  return Response.json(
    {
      now: new Date().toISOString(),
      istDate: today,
      latestEdition,
      editionFresh: latestEdition === today,
      digestSentToday,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
