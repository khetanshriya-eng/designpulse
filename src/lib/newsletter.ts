/**
 * Daily email digest — generation + send via Buttondown.
 *
 * `generateDigestMarkdown` is pure (easy to test). `runSendDigest` does the
 * DB read + selection + send, and is called by both the /api/send-digest route
 * (manual trigger) and the morning pipeline run (the scheduled path — Hobby's
 * 2-cron limit means we fold the send into the pipeline rather than add a
 * third cron). Deploy-safe: if BUTTONDOWN_API_KEY is unset it logs + skips.
 */
import "server-only";
import { createPublicClient } from "@/lib/db/client";
import { sourcePriority, CATEGORY_META, type SourceCategory } from "@/data/sources";
import { isOffBrand } from "@/lib/content/filter";
import { logger, type Logger } from "@/lib/logger";

const BUTTONDOWN_API = "https://api.buttondown.com/v1";
const SITE = "https://designatorapp.com";
const DIGEST_SIZE = 7;

export type DigestArticle = {
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  category: string; // category slug
  readMinutes: number | null;
};

export function generateDigestMarkdown(
  articles: DigestArticle[],
  dateLabel: string
): { subject: string; body: string } {
  const subject = `✦ Designator — ${dateLabel}`;

  const blocks = articles
    .map((a, i) => {
      const cat =
        CATEGORY_META[a.category as SourceCategory]?.label ?? a.category;
      const read = a.readMinutes ? `${a.readMinutes} min read` : "quick read";
      return [
        `**${i + 1}. ${a.title}**`,
        `*${a.sourceName} · ${cat} · ${read}*`,
        "",
        a.summary,
        "",
        `[Read full article →](${a.url})`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const body = [
    `# ✦ Today's Top Picks`,
    "",
    `*${articles.length} stories worth your time.*`,
    "",
    "---",
    "",
    blocks,
    "",
    "---",
    "",
    `[See today's full edition on Designator →](${SITE})`,
    "",
    `*You're receiving this because you subscribed to Designator — the daily briefing for product designers. Curated sources, summarized, in one tab.*`,
  ].join("\n");

  return { subject, body };
}

type Candidate = {
  title: string;
  summary: string;
  url: string;
  category: string;
  readMinutes: number | null;
  srcName: string;
  srcSlug: string;
};

export type SendDigestResult = {
  sent: boolean;
  count: number;
  subject?: string;
  reason?: string;
  /** Populated on Buttondown failures so cron logs / manual runs show WHY. */
  buttondown?: { status: number; detail: string };
};

/**
 * Build and send the daily digest: the top {@link DIGEST_SIZE} design-first
 * picks from the last 24h (tier-1/2 only, off-brand filtered, ≤2 per category
 * and ≤2 per source), rendered to Markdown and sent via Buttondown.
 */
export async function runSendDigest(
  opts: { log?: Logger; dryRun?: boolean } = {}
): Promise<SendDigestResult> {
  const log = opts.log ?? logger("newsletter.send");

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    log.warn("digest skipped — BUTTONDOWN_API_KEY not set");
    return { sent: false, count: 0, reason: "no api key" };
  }

  const sb = createPublicClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("articles")
    .select("title, summary, original_url, category, read_minutes, sources(name, slug)")
    .gte("published_at", since)
    .not("summary", "is", null)
    .neq("summary", "")
    .not("title", "is", null)
    .neq("title", "")
    .not("title", "ilike", "http%")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(40);
  if (error) throw error;

  type Row = {
    title: string;
    summary: string | null;
    original_url: string;
    category: string;
    read_minutes: number | null;
    sources: { name: string; slug: string } | { name: string; slug: string }[] | null;
  };

  // Featurable (tier 1/2), on-brand candidates — same bar as the must-reads.
  const candidates: Candidate[] = [];
  for (const r of (data ?? []) as Row[]) {
    const src = Array.isArray(r.sources) ? r.sources[0] : r.sources;
    if (!src) continue;
    if (isOffBrand(r.title, r.original_url)) continue;
    if (sourcePriority(src.slug) > 2) continue;
    candidates.push({
      title: r.title,
      summary: r.summary ?? "",
      url: r.original_url,
      category: r.category,
      readMinutes: r.read_minutes,
      srcName: src.name,
      srcSlug: src.slug,
    });
  }
  // Stage log: how the funnel narrowed (fetched → on-brand tier-1/2). Makes
  // "no articles" diagnosable from Vercel logs instead of a silent skip.
  log.info("digest candidates", {
    fetched: (data ?? []).length,
    eligible: candidates.length,
  });

  // Tier 1 leads; recency order preserved within a tier (stable sort).
  candidates.sort((a, b) => sourcePriority(a.srcSlug) - sourcePriority(b.srcSlug));

  // Greedy pick with category + source diversity.
  const selected: Candidate[] = [];
  const catCount: Record<string, number> = {};
  const srcCount: Record<string, number> = {};
  for (const c of candidates) {
    if (selected.length >= DIGEST_SIZE) break;
    if ((catCount[c.category] ?? 0) >= 2) continue;
    if ((srcCount[c.srcSlug] ?? 0) >= 2) continue;
    selected.push(c);
    catCount[c.category] = (catCount[c.category] ?? 0) + 1;
    srcCount[c.srcSlug] = (srcCount[c.srcSlug] ?? 0) + 1;
  }

  if (selected.length === 0) {
    log.warn("digest skipped — no eligible articles in the last 24h");
    return { sent: false, count: 0, reason: "no articles" };
  }

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const { subject, body } = generateDigestMarkdown(
    selected.map((c) => ({
      title: c.title,
      summary: c.summary,
      url: c.url,
      sourceName: c.srcName,
      category: c.category,
      readMinutes: c.readMinutes,
    })),
    dateLabel
  );

  // Dry run: everything above (DB read, selection, rendering) executed for
  // real; only the Buttondown POST is skipped. Used to diagnose the pipeline
  // in production without emailing subscribers.
  if (opts.dryRun) {
    log.info("digest dry run — send skipped", {
      count: selected.length,
      subject,
      sources: selected.map((c) => c.srcSlug),
    });
    return { sent: false, count: selected.length, subject, reason: "dry run" };
  }

  // status "about_to_send" = create AND deliver immediately. ("sent" is a
  // terminal state Buttondown sets itself — creating with it 400s with
  // status_invalid, which is exactly how every cron digest failed silently
  // until 2026-07: valid creation statuses per their error metadata are
  // draft / about_to_send / scheduled / imported / transactional.)
  const res = await fetch(`${BUTTONDOWN_API}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subject, body, status: "about_to_send" }),
  });

  if (!res.ok) {
    // Surface Buttondown's own explanation (plan limits, key issues, …) in
    // both the log and the result, so a failing cron is diagnosable from the
    // Vercel dashboard and a manual run shows the reason in the response.
    const detail = await res.text().catch(() => "");
    log.error("digest send failed", { status: res.status, detail });
    return {
      sent: false,
      count: selected.length,
      subject,
      reason: "buttondown error",
      buttondown: { status: res.status, detail: detail.slice(0, 500) },
    };
  }

  log.info("digest sent", { count: selected.length, subject });
  return { sent: true, count: selected.length, subject };
}
