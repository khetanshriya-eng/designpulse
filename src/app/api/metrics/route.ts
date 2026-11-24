/**
 * GET /api/metrics — run the metrics steps by hand.
 *   ?capture=1  save yesterday's numbers (same as the 06:00 IST run)
 *   ?clicks=1   count today's recorded clicks out and reader pages, by host
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
import { createServiceClient } from "@/lib/db/client";
import { istToday } from "@/lib/ist";

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
    if (q.get("clicks")) {
      const { data, error } = await createServiceClient()
        .from("outbound_clicks")
        .select("host")
        .eq("day", istToday());
      if (error) throw new Error(`outbound_clicks read failed: ${error.message}`);
      const byHost: Record<string, number> = {};
      for (const r of data ?? []) byHost[r.host ?? "unknown"] = (byHost[r.host ?? "unknown"] ?? 0) + 1;
      out.clicksToday = byHost;
      const { data: visits } = await createServiceClient()
        .from("reader_visits")
        .select("host, visit_id")
        .eq("day", istToday());
      const visitsByHost: Record<string, number> = {};
      for (const r of visits ?? []) visitsByHost[r.host ?? "unknown"] = (visitsByHost[r.host ?? "unknown"] ?? 0) + 1;
      out.readerPagesToday = visitsByHost;
    }
    if (q.get("report")) out.report = await sendWeeklyReport(log, { force: true });
  } catch (err) {
    return Response.json({ ...out, error: (err as Error).message }, { status: 500 });
  }
  return Response.json(out);
}
