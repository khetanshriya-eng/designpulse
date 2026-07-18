/**
 * Daily email digest — selection + rendering + send via Buttondown.
 *
 * Selection guarantees a floor of {@link DIGEST_MIN} stories (target
 * {@link DIGEST_TARGET}) by progressively relaxing constraints across
 * {@link PASSES} instead of silently sending whatever survives the strictest
 * filter. Rendering is email-safe inline-styled HTML (tables, no web fonts,
 * no CSS vars) that carries the pixel brand into Gmail.
 *
 * `runSendDigest` is called by the /api/send-digest route (manual trigger,
 * supports ?dry=1 and ?draft=1) and the morning pipeline run (the scheduled
 * path — Hobby's 2-cron limit means the send is folded into the pipeline).
 * Deploy-safe: if BUTTONDOWN_API_KEY is unset it logs + skips.
 */
import "server-only";
import { createPublicClient } from "@/lib/db/client";
import { sourcePriority, CATEGORY_META, type SourceCategory } from "@/data/sources";
import { getEditionName } from "@/lib/editionName";
import { isOffBrand } from "@/lib/content/filter";
import { logger, type Logger } from "@/lib/logger";

const BUTTONDOWN_API = "https://api.buttondown.com/v1";
const SITE = "https://designatorapp.com";

const DIGEST_TARGET = 7; // aim for this many stories
const DIGEST_MIN = 5; // below this we log a warning (but still send)
const DIGEST_HARD_MIN = 3; // below this we skip the day entirely

export type DigestArticle = {
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  category: string; // category slug
  readMinutes: number | null;
};

/* ------------------------------------------------------------------ *
 * Selection — progressive relaxation                                  *
 * ------------------------------------------------------------------ */

type Candidate = {
  title: string;
  summary: string;
  url: string;
  category: string;
  readMinutes: number | null;
  srcName: string;
  srcSlug: string;
  tier: number;
  publishedMs: number;
};

/**
 * Relaxation ladder: each pass may only ADD articles (dedup by url), never
 * remove — so the strictest picks always lead the email. Pass 1 is the
 * original strict filter; later passes widen the window, loosen the category
 * cap, then finally admit tier-3 sources to fill remaining slots.
 */
const PASSES = [
  { hours: 24, maxTier: 2, maxPerCat: 2, maxPerSource: 2 },
  { hours: 48, maxTier: 2, maxPerCat: 2, maxPerSource: 2 },
  { hours: 48, maxTier: 2, maxPerCat: 3, maxPerSource: 2 },
  { hours: 48, maxTier: 3, maxPerCat: 3, maxPerSource: 2 },
] as const;

/** Greedy multi-pass pick. Returns the selection and the last pass used. */
function selectDigestArticles(
  candidates: Candidate[],
  now: number
): { selected: Candidate[]; pass: number } {
  const selected: Candidate[] = [];
  const seen = new Set<string>();
  const catCount: Record<string, number> = {};
  const srcCount: Record<string, number> = {};
  let passUsed = 0;

  for (let i = 0; i < PASSES.length; i++) {
    const p = PASSES[i];
    const cutoff = now - p.hours * 60 * 60 * 1000;
    for (const c of candidates) {
      if (selected.length >= DIGEST_TARGET) break;
      if (seen.has(c.url)) continue;
      if (c.tier > p.maxTier) continue;
      if (c.publishedMs < cutoff) continue;
      if ((catCount[c.category] ?? 0) >= p.maxPerCat) continue;
      if ((srcCount[c.srcSlug] ?? 0) >= p.maxPerSource) continue;
      selected.push(c);
      seen.add(c.url);
      catCount[c.category] = (catCount[c.category] ?? 0) + 1;
      srcCount[c.srcSlug] = (srcCount[c.srcSlug] ?? 0) + 1;
    }
    passUsed = i + 1;
    if (selected.length >= DIGEST_TARGET) break;
  }

  return { selected, pass: passUsed };
}

/* ------------------------------------------------------------------ *
 * Rendering                                                           *
 * ------------------------------------------------------------------ */

// Literal hexes for email (CSS vars don't exist in Gmail). Mirrors the
// deepened category colors in globals.css.
const EMAIL_CAT_COLORS: Record<string, string> = {
  "design-tools": "#7a6000",
  "ux-thinking": "#5b48d8",
  inspiration: "#0d7a52",
  youtube: "#cc0000",
  product: "#b51483",
  "tech-news": "#00708a",
  "ai-tools": "#9a5f00",
  newsletters: "#7f43c6",
  podcasts: "#c13434",
};

const PURPLE = "#5b3df5";
const NAVY = "#1a1340";
const LIME = "#d4ff3f";
const CREAM = "#fffaf0";
const GRAY = "#5c5470";
const MONO = "'Courier New', Courier, monospace";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Email-safe HTML digest: table layout, inline styles only, mono system stack
 * for the retro feel (pixel webfonts won't load in Gmail), text wordmark (no
 * images — they're blocked by default), hard 2–3px borders instead of the
 * site's offset shadows (box-shadow support in email clients is patchy).
 * `{{ unsubscribe_url }}` is substituted per-recipient by Buttondown.
 */
export function renderDigestHtml(
  articles: DigestArticle[],
  editionName: string,
  dateLabel: string
): string {
  const rows = articles
    .map((a, i) => {
      const cat = CATEGORY_META[a.category as SourceCategory]?.label ?? a.category;
      const catColor = EMAIL_CAT_COLORS[a.category] ?? PURPLE;
      const read = a.readMinutes ? `${a.readMinutes} min read` : "quick read";
      return `
      <tr>
        <td style="padding:20px 24px 22px;border-top:2px solid ${NAVY};">
          <div style="font-family:${MONO};font-size:12px;line-height:1;margin:0 0 10px;">
            <span style="background:${LIME};color:${NAVY};font-weight:bold;padding:2px 8px;border:2px solid ${NAVY};">${i + 1}</span>
            <span style="color:${catColor};font-weight:bold;text-transform:uppercase;letter-spacing:1px;">&nbsp; ${esc(cat)}</span>
            <span style="color:${GRAY};">&nbsp;·&nbsp; ${esc(a.sourceName)} &nbsp;·&nbsp; ${esc(read)}</span>
          </div>
          <a href="${esc(a.url)}" style="font-family:${MONO};font-size:18px;line-height:1.4;font-weight:bold;color:${NAVY};text-decoration:none;">${esc(a.title)}</a>
          ${
            a.summary
              ? `<p style="font-family:${MONO};font-size:14px;line-height:1.6;color:${GRAY};margin:10px 0 12px;">${esc(a.summary)}</p>`
              : `<div style="height:12px;"></div>`
          }
          <a href="${esc(a.url)}" style="font-family:${MONO};font-size:13px;font-weight:bold;color:${NAVY};background:${LIME};padding:4px 10px;border:2px solid ${NAVY};text-decoration:none;">Read&nbsp;→</a>
        </td>
      </tr>`;
    })
    .join("");

  return `<!-- designator digest -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f0e8;padding:16px 8px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${CREAM};border:3px solid ${NAVY};">
        <!-- Header band -->
        <tr>
          <td style="background:${PURPLE};padding:22px 24px;border-bottom:3px solid ${NAVY};">
            <div style="font-family:${MONO};font-size:26px;font-weight:bold;letter-spacing:-1px;color:${LIME};">designator <span style="color:${CREAM};">✦</span></div>
            <div style="font-family:${MONO};font-size:16px;font-weight:bold;color:${CREAM};margin-top:8px;">${esc(editionName)}</div>
            <div style="font-family:${MONO};font-size:12px;color:rgba(255,250,240,0.75);margin-top:4px;">${esc(dateLabel)} &nbsp;·&nbsp; ${articles.length} stories</div>
          </td>
        </tr>
        <!-- Intro line (keeps the email from being 100% links) -->
        <tr>
          <td style="padding:16px 24px;">
            <p style="font-family:${MONO};font-size:14px;line-height:1.6;color:${GRAY};margin:0;">Good morning — the design stories worth your time today, hand-picked from 75+ sources and summarized so you're current in five minutes.</p>
          </td>
        </tr>
        <!-- Stories -->
        ${rows}
        <!-- CTA -->
        <tr>
          <td align="center" style="padding:24px;border-top:2px solid ${NAVY};">
            <a href="${SITE}" style="font-family:${MONO};font-size:14px;font-weight:bold;color:${NAVY};background:${LIME};padding:12px 20px;border:2px solid ${NAVY};text-decoration:none;display:inline-block;">See today's full edition&nbsp;→</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:${NAVY};padding:18px 24px;">
            <p style="font-family:${MONO};font-size:12px;line-height:1.7;color:rgba(255,250,240,0.7);margin:0;">
              You're getting this because you subscribed to <a href="${SITE}" style="color:${LIME};text-decoration:none;">Designator</a> — the daily briefing for product designers.<br />
              <a href="{{ unsubscribe_url }}" style="color:rgba(255,250,240,0.9);text-decoration:underline;">Unsubscribe</a>
              &nbsp;·&nbsp; <a href="${SITE}" style="color:rgba(255,250,240,0.9);text-decoration:underline;">designatorapp.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Plaintext (Markdown) fallback — kept for tests and for clients/contexts
 * where the HTML template isn't wanted.
 */
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

/* ------------------------------------------------------------------ *
 * Send                                                                *
 * ------------------------------------------------------------------ */

export type SendDigestResult = {
  sent: boolean;
  count: number;
  subject?: string;
  reason?: string;
  /** Which relaxation pass filled the quota (1 = strict 24h). */
  pass?: number;
  /** Populated on Buttondown failures so cron logs / manual runs show WHY. */
  buttondown?: { status: number; detail: string };
};

/**
 * Build and send the daily digest. Selection: multi-pass relaxation (see
 * {@link PASSES}) with a floor of {@link DIGEST_MIN}; below
 * {@link DIGEST_HARD_MIN} the day is skipped.
 */
export async function runSendDigest(
  opts: { log?: Logger; dryRun?: boolean; draft?: boolean } = {}
): Promise<SendDigestResult> {
  const log = opts.log ?? logger("newsletter.send");

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    log.warn("digest skipped — BUTTONDOWN_API_KEY not set");
    return { sent: false, count: 0, reason: "no api key" };
  }

  // One 48h fetch; the 24h strict pass filters in memory (fewer round trips
  // than querying per pass).
  const sb = createPublicClient();
  const now = Date.now();
  const since = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("articles")
    .select(
      "title, summary, original_url, category, read_minutes, published_at, sources(name, slug)"
    )
    .gte("published_at", since)
    .not("summary", "is", null)
    .neq("summary", "")
    .not("title", "is", null)
    .neq("title", "")
    .not("title", "ilike", "http%")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) throw error;

  type Row = {
    title: string;
    summary: string | null;
    original_url: string;
    category: string;
    read_minutes: number | null;
    published_at: string | null;
    sources: { name: string; slug: string } | { name: string; slug: string }[] | null;
  };

  // On-brand candidates, all tiers (tier filtering happens per pass).
  const candidates: Candidate[] = [];
  for (const r of (data ?? []) as Row[]) {
    const src = Array.isArray(r.sources) ? r.sources[0] : r.sources;
    if (!src) continue;
    if (isOffBrand(r.title, r.original_url)) continue;
    const publishedMs = r.published_at ? Date.parse(r.published_at) : NaN;
    if (!Number.isFinite(publishedMs)) continue;
    candidates.push({
      title: r.title,
      summary: r.summary ?? "",
      url: r.original_url,
      category: r.category,
      readMinutes: r.read_minutes,
      srcName: src.name,
      srcSlug: src.slug,
      tier: sourcePriority(src.slug),
      publishedMs,
    });
  }
  // Tier 1 leads; recency order preserved within a tier (stable sort).
  candidates.sort((a, b) => a.tier - b.tier);

  const { selected, pass } = selectDigestArticles(candidates, now);

  // Stage log: how the funnel narrowed and how hard we had to relax. Makes
  // thin days diagnosable from Vercel logs instead of a silent 2-story email.
  log.info("digest selection", {
    fetched: (data ?? []).length,
    eligible: candidates.length,
    selected: selected.length,
    pass,
  });

  if (selected.length < DIGEST_HARD_MIN) {
    log.warn("digest skipped — too few articles after all passes", {
      count: selected.length,
    });
    return {
      sent: false,
      count: selected.length,
      pass,
      reason: "too few articles",
    };
  }
  if (selected.length < DIGEST_MIN) {
    log.warn(`digest thin — only ${selected.length} articles after all passes`);
  }

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const isoDate = today.toISOString().slice(0, 10);
  const subject = `✦ Designator — ${dateLabel}`;
  const html = renderDigestHtml(
    selected.map((c) => ({
      title: c.title,
      summary: c.summary,
      url: c.url,
      sourceName: c.srcName,
      category: c.category,
      readMinutes: c.readMinutes,
    })),
    getEditionName(isoDate),
    dateLabel
  );

  // Dry run: everything above (DB read, selection, rendering) executed for
  // real; only the Buttondown POST is skipped. Used to diagnose the pipeline
  // in production without emailing subscribers.
  if (opts.dryRun) {
    log.info("digest dry run — send skipped", {
      count: selected.length,
      subject,
      pass,
      sources: selected.map((c) => c.srcSlug),
    });
    return {
      sent: false,
      count: selected.length,
      subject,
      pass,
      reason: "dry run",
    };
  }

  // status "about_to_send" = create AND deliver immediately; "draft" parks it
  // in the Buttondown dashboard for design review / test sends. ("sent" is a
  // terminal state Buttondown sets itself — creating with it 400s.)
  const res = await fetch(`${BUTTONDOWN_API}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
      // Buttondown's one-time-per-key confirmation that programmatic sending
      // is intentional (400 sending_requires_confirmation without it). Kept
      // permanently — same pattern as the subscribe route's firewall bypass.
      "X-Buttondown-Live-Dangerously": "true",
    },
    body: JSON.stringify({
      subject,
      body: html,
      status: opts.draft ? "draft" : "about_to_send",
    }),
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
      pass,
      reason: "buttondown error",
      buttondown: { status: res.status, detail: detail.slice(0, 500) },
    };
  }

  if (opts.draft) {
    log.info("digest draft created", { count: selected.length, subject, pass });
    return {
      sent: false,
      count: selected.length,
      subject,
      pass,
      reason: "draft created",
    };
  }

  log.info("digest sent", { count: selected.length, subject, pass });
  return { sent: true, count: selected.length, subject, pass };
}
