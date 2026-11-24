/**
 * Site metrics: a daily snapshot and a weekly email to the admin.
 *
 * Clarity's Data Export API only returns the last 1–3 days (max 10 calls a
 * day), so a weekly look-back can't see a whole week. Instead the 06:00 IST
 * pipeline run calls `captureDailyMetrics` (2 Clarity calls: totals + by
 * source) and stores the previous 24 h as yesterday's row in metrics_daily.
 * On Mondays it then calls `sendWeeklyReport`, which builds Mon–Sun from
 * those rows and emails ADMIN_EMAIL once (weekly_report_log guards it).
 *
 * Both functions fail soft: metrics must never break the pipeline or the
 * digest. Needs CLARITY_TOKEN (Vercel env); without it only the subscriber
 * numbers are recorded.
 */
import "server-only";
import { createServiceClient } from "@/lib/db/client";
import { IST_OFFSET_MS, istToday } from "@/lib/ist";
import { sendAdminAlert } from "@/lib/notify";
import type { Logger } from "@/lib/logger";
import type { MetricsDailyRow } from "@/lib/db/types";

const CLARITY_URL = "https://www.clarity.ms/export-data/api/v1/project-live-insights";

type ClarityMetric = { metricName: string; information: Record<string, unknown>[] };

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

async function clarity(token: string, dimension?: string): Promise<ClarityMetric[]> {
  const url = `${CLARITY_URL}?numOfDays=1${dimension ? `&dimension1=${dimension}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Clarity ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return (await res.json()) as ClarityMetric[];
}

function metric(data: unknown, name: string): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return ((data as ClarityMetric[]).find((m) => m.metricName === name)?.information ?? []) as Record<string, unknown>[];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

async function activeSubscribers(): Promise<number | null> {
  const svc = createServiceClient();
  const { count, error } = await svc
    .from("subscribers")
    .select("email", { count: "exact", head: true })
    .eq("status", "active");
  return error ? null : count ?? 0;
}

/** Store yesterday's (IST) numbers. Idempotent: re-running overwrites the row. */
export async function captureDailyMetrics(log: Logger, now: number = Date.now()) {
  const day = addDays(istToday(now), -1);
  const token = process.env.CLARITY_TOKEN?.trim();
  const row: Partial<MetricsDailyRow> & { day: string } = { day, fetched_at: new Date(now).toISOString() };

  const [totals, bySource, subscribers] = await Promise.allSettled([
    token ? clarity(token) : Promise.reject(new Error("CLARITY_TOKEN not set")),
    token ? clarity(token, "Source") : Promise.reject(new Error("CLARITY_TOKEN not set")),
    activeSubscribers(),
  ]);

  if (totals.status === "fulfilled") {
    const t = metric(totals.value, "Traffic")[0] ?? {};
    row.clarity = totals.value;
    row.sessions = num(t.totalSessionCount);
    row.bot_sessions = num(t.totalBotSessionCount);
    row.users = num(t.distinctUserCount);
  } else {
    log.warn("clarity capture failed", { error: (totals.reason as Error).message });
  }
  if (bySource.status === "fulfilled") row.clarity_source = bySource.value;
  if (subscribers.status === "fulfilled") row.subscribers = subscribers.value;

  const svc = createServiceClient();
  const { error } = await svc.from("metrics_daily").upsert(row, { onConflict: "day" });
  if (error) throw new Error(`metrics_daily write failed (run migration 0006?): ${error.message}`);
  return {
    day,
    sessions: row.sessions ?? null,
    subscribers: row.subscribers ?? null,
    clarity: totals.status === "fulfilled" ? "ok" : (totals.reason as Error).message,
  };
}

type WeekSummary = {
  days: number;
  sessions: number;
  bots: number;
  users: number;
  mobile: number;
  sources: Map<string, number>;
  pages: Map<string, number>;
  rageSessions: number;
  deadSessions: number;
};

function summarize(rows: MetricsDailyRow[]): WeekSummary {
  const s: WeekSummary = { days: 0, sessions: 0, bots: 0, users: 0, mobile: 0, sources: new Map(), pages: new Map(), rageSessions: 0, deadSessions: 0 };
  for (const r of rows) {
    if (r.sessions == null) continue;
    s.days++;
    s.sessions += r.sessions;
    s.bots += r.bot_sessions ?? 0;
    s.users += r.users ?? 0; // summed daily uniques: a returning reader counts once per day
    for (const d of metric(r.clarity, "Device")) if (d.name === "Mobile" || d.name === "Tablet") s.mobile += num(d.sessionsCount);
    for (const p of metric(r.clarity, "PopularPages")) {
      const path = String(p.url ?? "").replace(/^https?:\/\/[^/]+/, "") || "/";
      s.pages.set(path, (s.pages.get(path) ?? 0) + num(p.visitsCount));
    }
    const pct = (name: string) => {
      const m = metric(r.clarity, name)[0];
      return m ? Math.round((num(m.sessionsWithMetricPercentage) / 100) * num(m.sessionsCount)) : 0;
    };
    s.rageSessions += pct("RageClickCount");
    s.deadSessions += pct("DeadClickCount");
    for (const t of metric(r.clarity_source, "Traffic")) {
      const src = String(t.Source ?? "").trim() || "direct / unknown";
      s.sources.set(src, (s.sources.get(src) ?? 0) + num(t.totalSessionCount));
    }
  }
  return s;
}

function delta(now: number, before: number, hasBefore: boolean): string {
  if (!hasBefore) return "";
  const d = now - before;
  if (d === 0) return " (same as last week)";
  const pct = before > 0 ? `, ${d > 0 ? "+" : ""}${Math.round((d / before) * 100)}%` : "";
  return ` (${d > 0 ? "+" : ""}${d} vs last week${pct})`;
}

function top(m: Map<string, number>, n: number): string {
  const list = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  return list.length ? list.map(([k, v]) => `${k} ${v}`).join(", ") : "none";
}

const fmt = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Monday report for the 7 IST days ending yesterday (Sunday). Exactly-once
 * per week via weekly_report_log. `force` (manual test) skips the Monday and
 * already-sent checks but still records nothing, so it can't block the real one.
 */
export async function sendWeeklyReport(log: Logger, opts: { now?: number; force?: boolean } = {}) {
  const now = opts.now ?? Date.now();
  const today = istToday(now);
  const weekday = new Date(now + IST_OFFSET_MS).getUTCDay(); // 1 = Monday (IST)
  if (!opts.force && weekday !== 1) return { sent: false, reason: "not Monday" };

  const weekEnd = addDays(today, -1);
  const weekStart = addDays(weekEnd, -6);
  const prevStart = addDays(weekStart, -7);
  const svc = createServiceClient();

  if (!opts.force) {
    const { data: done } = await svc.from("weekly_report_log").select("week_end").eq("week_end", weekEnd).maybeSingle();
    if (done) return { sent: false, reason: "already sent this week" };
  }

  const [{ data: rows, error }, { data: digests }, { data: joined }, { data: left }] = await Promise.all([
    svc.from("metrics_daily").select("*").gte("day", prevStart).lte("day", weekEnd).order("day"),
    svc.from("digest_log").select("send_date").gte("send_date", weekStart).lte("send_date", weekEnd),
    svc.from("subscribers").select("email").gte("created_at", `${weekStart}T00:00:00+05:30`).lt("created_at", `${today}T00:00:00+05:30`),
    svc.from("subscribers").select("unsub_reason").eq("status", "unsubscribed").gte("unsubscribed_at", `${weekStart}T00:00:00+05:30`).lt("unsubscribed_at", `${today}T00:00:00+05:30`),
  ]);
  if (error) throw new Error(`metrics_daily read failed: ${error.message}`);

  // Clicks out to stories (migration 0007). Production hosts only: previews
  // share the database. Fails soft if the table isn't there yet.
  const PROD = ["www.designatorapp.com", "designatorapp.com"];
  const { data: clickRows } = await svc
    .from("outbound_clicks")
    .select("day, url")
    .gte("day", prevStart)
    .lte("day", weekEnd)
    .in("host", PROD);
  const clicksNow = (clickRows ?? []).filter((c) => c.day >= weekStart);
  const clicksPrev = (clickRows ?? []).filter((c) => c.day < weekStart).length;
  const byUrl = new Map<string, number>();
  for (const c of clicksNow) byUrl.set(c.url, (byUrl.get(c.url) ?? 0) + 1);
  const topUrls = [...byUrl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const titles = new Map<string, string>();
  if (topUrls.length) {
    const { data: arts } = await svc.from("articles").select("original_url, title").in("original_url", topUrls.map(([u]) => u));
    for (const a of arts ?? []) if (a.title) titles.set(a.original_url, a.title);
  }

  const all = (rows ?? []) as MetricsDailyRow[];
  const cur = summarize(all.filter((r) => r.day >= weekStart));
  const prev = summarize(all.filter((r) => r.day < weekStart));
  const hasPrev = prev.days > 0;

  const subsNow = await activeSubscribers();
  const subsWeekAgo = all.find((r) => r.day === addDays(weekStart, -1))?.subscribers ?? null;
  const reasons = new Map<string, number>();
  for (const r of left ?? []) reasons.set(r.unsub_reason ?? "unknown", (reasons.get(r.unsub_reason ?? "unknown") ?? 0) + 1);
  const bounced = (reasons.get("bounced") ?? 0) + (reasons.get("soft-bounced") ?? 0) + (reasons.get("complained") ?? 0);
  const digestDays = digests?.length ?? 0;

  const attention: string[] = [];
  if (cur.days < 7) attention.push(`Traffic covers ${cur.days} of 7 days (capture started recently or Clarity failed on some days).`);
  if (digestDays < 7) attention.push(`The digest went out on ${digestDays} of 7 days.`);
  if (bounced > 0) attention.push(`${bounced} address${bounced === 1 ? "" : "es"} removed for bouncing or complaints.`);
  if (hasPrev && prev.sessions >= 10 && cur.sessions < prev.sessions * 0.6) attention.push("Traffic dropped by more than 40%.");

  const body = [
    `Designator, week of ${fmt(weekStart)} to ${fmt(weekEnd)} (IST)`,
    "",
    "TRAFFIC (Clarity)",
    `  Sessions: ${cur.sessions}${delta(cur.sessions, prev.sessions, hasPrev)}${cur.bots ? `, ${cur.bots} flagged as bots` : ""}`,
    `  Daily visitors, summed: ${cur.users}${delta(cur.users, prev.users, hasPrev)}`,
    `  Mobile: ${cur.sessions ? Math.round((cur.mobile / cur.sessions) * 100) : 0}% of sessions`,
    `  Top sources: ${top(cur.sources, 4)}`,
    `  Top pages: ${top(cur.pages, 4)}`,
    `  Rage clicks: ${cur.rageSessions} session${cur.rageSessions === 1 ? "" : "s"}; dead clicks: ${cur.deadSessions}`,
    "",
    "READING (clicks out to stories)",
    `  Clicks: ${clicksNow.length}${delta(clicksNow.length, clicksPrev, clicksPrev > 0)}`,
    ...topUrls.map(([u, n]) => `  ${n}× ${(titles.get(u) ?? u).slice(0, 90)}`),
    "",
    "NEWSLETTER",
    `  Active subscribers: ${subsNow ?? "unknown"}${subsNow != null && subsWeekAgo != null ? delta(subsNow, subsWeekAgo, true) : ""}`,
    `  New this week: ${joined?.length ?? 0}; left: ${left?.length ?? 0}${reasons.size ? ` (${top(reasons, 4)})` : ""}`,
    `  Digest sent: ${digestDays} of 7 days`,
    "",
    attention.length ? "NEEDS A LOOK" : "Nothing needs attention.",
    ...attention.map((a) => `  - ${a}`),
  ].join("\n");

  const ok = await sendAdminAlert({ subject: `Weekly numbers: ${cur.sessions} sessions, ${subsNow ?? "?"} subscribers`, body });
  if (!ok) return { sent: false, reason: "email failed" };
  if (!opts.force) await svc.from("weekly_report_log").insert({ week_end: weekEnd });
  log.info("weekly report sent", { weekStart, weekEnd });
  return { sent: true, weekStart, weekEnd };
}
