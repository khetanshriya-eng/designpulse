/**
 * GET /api/metrics — run the metrics steps by hand.
 *   ?capture=1  save yesterday's numbers (same as the 06:00 IST run)
 *   ?report=1   email the weekly report now (test send; doesn't count as
 *               this week's, so Monday's real report still goes out)
 *
 * Production needs `Authorization: Bearer $CRON_SECRET`. On Vercel preview
 * deployments the route is open, because previews already sit behind the
 * owner's Vercel login; that's how staging is checked from a browser.
 */
import type { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { captureDailyMetrics, sendWeeklyReport } from "@/lib/metrics";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") {
    const denied = checkCronAuth(req);
    if (denied) return denied;
  }
  const log = logger("api.metrics");
  const q = new URL(req.url).searchParams;
  const out: Record<string, unknown> = {};
  try {
    if (q.get("capture")) out.capture = await captureDailyMetrics(log);
    if (q.get("report")) out.report = await sendWeeklyReport(log, { force: true });
  } catch (err) {
    return Response.json({ ...out, error: (err as Error).message }, { status: 500 });
  }
  return Response.json(out);
}
