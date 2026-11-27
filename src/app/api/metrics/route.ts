/**
 * GET /api/metrics — run the metrics steps by hand.
 *   ?capture=1  save yesterday's numbers (same as the 06:00 IST run)
 *   ?clicks=1   count today's recorded clicks out and reader pages, by host
 *   ?history=1  per-day production readers, clicks out, Clarity totals,
 *               subscribers and digest sends (read-only)
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
    if (q.get("history")) {
      const db = createServiceClient();
      const PROD = new Set(["www.designatorapp.com", "designatorapp.com"]);
      const days: Record<string, { readers: Set<string>; pages: number; clicks: number }> = {};
      const day = (d: string) => (days[d] ??= { readers: new Set(), pages: 0, clicks: 0 });
      const { data: visits, error: ve } = await db
        .from("reader_visits")
        .select("day, visit_id, host")
        .limit(20000);
      if (ve) throw new Error(`reader_visits read failed: ${ve.message}`);
      for (const v of visits ?? []) {
        if (!PROD.has(v.host ?? "")) continue;
        const d = day(v.day);
        d.readers.add(v.visit_id);
        d.pages += 1;
      }
      const { data: clicks, error: ce } = await db
        .from("outbound_clicks")
        .select("day, host")
        .limit(20000);
      if (ce) throw new Error(`outbound_clicks read failed: ${ce.message}`);
      for (const c of clicks ?? []) if (PROD.has(c.host ?? "")) day(c.day).clicks += 1;
      out.site = Object.keys(days)
        .sort()
        .map((d) => ({ day: d, readerVisits: days[d].readers.size, pages: days[d].pages, clicksOut: days[d].clicks }));
      const { data: md } = await db
        .from("metrics_daily")
        .select("day, sessions, bot_sessions, users, subscribers")
        .order("day");
      out.clarityDaily = md ?? [];
      const { data: dl } = await db
        .from("digest_log")
        .select("send_date, recipients, story_count")
        .order("send_date");
      out.digests = dl ?? [];
    }
    if (q.get("report")) out.report = await sendWeeklyReport(log, { force: true });
  } catch (err) {
    return Response.json({ ...out, error: (err as Error).message }, { status: 500 });
  }
  return Response.json(out);
}
