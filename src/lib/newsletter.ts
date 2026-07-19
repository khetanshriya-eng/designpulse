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
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { logger, type Logger } from "@/lib/logger";

const BUTTONDOWN_API = "https://api.buttondown.com/v1";
const SITE = "https://designatorapp.com";

/** Swapped for a per-recipient HMAC link on the Resend path, or for
 * Buttondown's own template variable on the draft/fallback path. */
const UNSUB_PLACEHOLDER = "%%UNSUBSCRIBE_URL%%";

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

/** Em/en dashes read as machine-written — swap for plain commas. Applied to
 * our AI summaries at render time (the prompt now bans them going forward,
 * but the DB still holds older ones). Publisher titles are left alone. */
function stripDashes(s: string): string {
  return s.replace(/\s*[—–]\s*/g, ", ");
}

/**
 * Email-safe HTML digest: table layout, inline styles only, mono system stack
 * for the retro feel (pixel webfonts won't load in Gmail), text wordmark (no
 * images — they're blocked by default), hard 2–3px borders instead of the
 * site's offset shadows (box-shadow support in email clients is patchy).
 * `{{ unsubscribe_url }}` is substituted per-recipient by Buttondown.
 *
 * Dark-mode strategy (audit 2026-07-19): Gmail's apps run an un-opt-outable
 * "smart invert" that flips light AND dark surfaces — so every text/background
 * pair here is a SOLID color with a big lightness gap (no alpha-composited
 * text, no mid-tone-on-mid-tone), which keeps both polarities readable.
 * Apple Mail / Outlook honor real dark CSS, so the wrapper also ships a
 * prefers-color-scheme block that re-skins the email in the site's night
 * palette.
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
      // Hierarchy, top to bottom: (1) number chip + category — alone on their
      // own nowrap line so nothing can collide or wrap under the chip;
      // (2) the title, big; (3) the summary; (4) source + read time as a
      // quiet byline; (5) the Read button. Generous spacing throughout.
      return `
      <tr>
        <td class="dm-cell" style="padding:26px 24px 28px;border-top:2px solid ${NAVY};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:${LIME};border:2px solid ${NAVY};font-family:${MONO};font-size:12px;line-height:1;font-weight:bold;color:${NAVY};padding:3px 9px;">${i + 1}</td>
              <td style="padding-left:12px;font-family:${MONO};font-size:11px;line-height:1;font-weight:bold;letter-spacing:2px;color:${catColor};white-space:nowrap;">${esc(cat.toUpperCase())}</td>
            </tr>
          </table>
          <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
          <a href="${esc(a.url)}" class="dm-title" style="font-family:${MONO};font-size:19px;line-height:1.4;font-weight:bold;color:${NAVY};text-decoration:none;">${esc(a.title)}</a>
          ${
            a.summary
              ? `<p class="dm-sum" style="font-family:${MONO};font-size:14px;line-height:1.65;color:${GRAY};margin:12px 0 0;">${esc(stripDashes(a.summary))}</p>`
              : ""
          }
          <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
          <div class="dm-byline" style="font-family:${MONO};font-size:12px;line-height:1;color:${GRAY};">${esc(a.sourceName)} &nbsp;·&nbsp; ${esc(read)}</div>
          <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
          <a href="${esc(a.url)}" style="font-family:${MONO};font-size:13px;font-weight:bold;color:${NAVY};background:${LIME};padding:6px 12px;border:2px solid ${NAVY};text-decoration:none;">Read&nbsp;→</a>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<style>
  /* Real dark mode for clients that honor it (Apple Mail, Outlook). Gmail
     ignores this and runs its own transform — the inline palette is chosen
     to survive that (solid colors, big lightness gaps). */
  @media (prefers-color-scheme: dark) {
    .dm-page { background: #0f0a2a !important; }
    .dm-card { background: #1a1340 !important; border-color: #7668c2 !important; }
    .dm-title { color: #f5f0e8 !important; }
    .dm-sum, .dm-intro { color: #c4bdd3 !important; }
    .dm-byline { color: #9b93a8 !important; }
    .dm-cell { border-color: #7668c2 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;">
<!-- designator digest -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dm-page" style="background:#f5f0e8;padding:16px 8px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="dm-card" style="max-width:600px;width:100%;background:${CREAM};border:3px solid ${NAVY};">
        <!-- Header band -->
        <tr>
          <td style="background:${PURPLE};padding:26px 24px;border-bottom:3px solid ${NAVY};">
            <div style="font-family:${MONO};font-size:26px;line-height:1;font-weight:bold;letter-spacing:-1px;color:${CREAM};">designator <span style="color:${LIME};">✦</span></div>
            <div style="font-family:${MONO};font-size:16px;line-height:1.3;font-weight:bold;color:${CREAM};margin-top:12px;">${esc(editionName)}</div>
            <div style="font-family:${MONO};font-size:12px;line-height:1;color:${CREAM};margin-top:8px;">${esc(dateLabel)} &nbsp;·&nbsp; ${articles.length} stories</div>
          </td>
        </tr>
        <!-- Intro line (keeps the email from being 100% links) -->
        <tr>
          <td style="padding:20px 24px;">
            <p class="dm-intro" style="font-family:${MONO};font-size:14px;line-height:1.65;color:${GRAY};margin:0;">Good morning. Here are today's design stories worth your time, picked from 75+ sources and summarized so you can catch up in five minutes.</p>
          </td>
        </tr>
        <!-- Stories -->
        ${rows}
        <!-- CTA -->
        <tr>
          <td class="dm-cell" align="center" style="padding:24px;border-top:2px solid ${NAVY};">
            <a href="${SITE}" style="font-family:${MONO};font-size:14px;font-weight:bold;color:${NAVY};background:${LIME};padding:12px 20px;border:2px solid ${NAVY};text-decoration:none;display:inline-block;">See today's full edition&nbsp;→</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:${NAVY};padding:18px 24px;">
            <p style="font-family:${MONO};font-size:12px;line-height:1.7;color:#cfc9dd;margin:0;">
              You're getting this because you subscribed to <a href="${SITE}" style="color:${CREAM};font-weight:bold;text-decoration:none;">Designator</a>, the daily briefing for product designers.<br />
              <a href="${UNSUB_PLACEHOLDER}" style="color:${CREAM};text-decoration:underline;">Unsubscribe</a>
              &nbsp;·&nbsp; <a href="${SITE}" style="color:${CREAM};text-decoration:underline;">designatorapp.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
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
  /** Delivery channel actually used (or that would be used, on a dry run). */
  via?: "resend" | "buttondown";
  /** How many addresses the digest went to (Resend path). */
  recipients?: number;
  /** Populated on Buttondown failures so cron logs / manual runs show WHY. */
  buttondown?: { status: number; detail: string };
  /** Populated on Resend failures. */
  resend?: { status: number; detail: string };
};

/**
 * Active subscriber emails from Buttondown (still the list of record — the
 * signup flow is unchanged). Defensive about field names (email/email_address)
 * and filters out any non-deliverable subscriber types.
 */
async function fetchButtondownSubscribers(
  apiKey: string,
  log: Logger
): Promise<string[]> {
  const out: string[] = [];
  let url: string | null = `${BUTTONDOWN_API}/subscribers`;
  for (let pageN = 0; url && pageN < 20; pageN++) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) {
      log.error("subscriber fetch failed", { status: res.status });
      break;
    }
    const data = (await res.json()) as {
      results?: Record<string, unknown>[];
      next?: string | null;
    };
    for (const s of data.results ?? []) {
      const email = (s.email_address ?? s.email) as string | undefined;
      const type = String(s.type ?? s.subscriber_type ?? "");
      if (!email) continue;
      // Skip anything not plainly deliverable (unactivated double-opt-ins,
      // unsubscribed, complained, paused, …).
      if (/unactiv|unsub|spam|trash|block|paused|churn|complain/i.test(type)) {
        continue;
      }
      // Skip malformed addresses and reserved test domains (a leftover
      // signup-test subscriber like foo@example.com makes Resend 422 the
      // whole batch it appears in).
      const lower = email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) continue;
      if (/@(example|test)\.(com|org|net)$|@example\./.test(lower)) continue;
      out.push(lower);
    }
    url = data.next ?? null;
  }
  return [...new Set(out)];
}

/**
 * Deliver via Resend from our own verified domain — the same sender identity
 * as the welcome email, which already reaches inboxes. Per-recipient HMAC
 * unsubscribe link in the footer plus List-Unsubscribe headers (Gmail's
 * one-click), both strong deliverability signals the shared Buttondown
 * domain couldn't give us on the free tier.
 */
async function sendViaResend(
  resendKey: string,
  subject: string,
  htmlTemplate: string,
  recipients: string[],
  log: Logger
): Promise<{ sentCount: number; failure?: { status: number; detail: string } }> {
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Designator <hello@designatorapp.com>";
  const authHeaders = {
    Authorization: `Bearer ${resendKey}`,
    "Content-Type": "application/json",
  };
  const itemFor = (email: string) => {
    const unsub = unsubscribeUrl(email);
    return {
      from,
      to: [email],
      subject,
      html: htmlTemplate.split(UNSUB_PLACEHOLDER).join(unsub),
      headers: {
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
  };

  let sentCount = 0;
  let failure: { status: number; detail: string } | undefined;
  // Resend's batch endpoint caps at 100 emails per call.
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(chunk.map(itemFor)),
    });
    if (res.ok) {
      sentCount += chunk.length;
      continue;
    }
    // Resend rejects a WHOLE batch if any single item fails validation — so
    // on failure, retry this chunk one address at a time. One bad subscriber
    // must never cost everyone else their edition.
    const detail = await res.text().catch(() => "");
    log.warn("resend batch rejected — retrying individually", {
      status: res.status,
      detail: detail.slice(0, 300),
    });
    for (const email of chunk) {
      const single = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(itemFor(email)),
      });
      if (single.ok) {
        sentCount++;
      } else {
        const d = await single.text().catch(() => "");
        failure = { status: single.status, detail: d.slice(0, 300) };
        log.error("resend send failed for recipient", {
          email,
          status: single.status,
          detail: d.slice(0, 200),
        });
      }
    }
  }
  return { sentCount, failure };
}

/**
 * Build and send the daily digest. Selection: multi-pass relaxation (see
 * {@link PASSES}) with a floor of {@link DIGEST_MIN}; below
 * {@link DIGEST_HARD_MIN} the day is skipped.
 */
export async function runSendDigest(
  opts: {
    log?: Logger;
    dryRun?: boolean;
    draft?: boolean;
    /** Send the real rendered email to ONE address only (design review). */
    to?: string;
  } = {}
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
  // Test sends get a distinct subject — otherwise Gmail threads them into the
  // same conversation as the day's real digest and design reviews end up
  // looking at the OLD email.
  const subject = opts.to
    ? `✦ Designator · ${dateLabel} · design test`
    : `✦ Designator · ${dateLabel}`;
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

  const resendKey = process.env.RESEND_API_KEY;
  const via: "resend" | "buttondown" = resendKey ? "resend" : "buttondown";

  // Design-review send: the real rendered email, to exactly one address —
  // never the subscriber list. Takes precedence over everything but dry runs.
  if (opts.to && !opts.dryRun) {
    if (!resendKey) {
      return {
        sent: false,
        count: selected.length,
        subject,
        pass,
        reason: "test send needs RESEND_API_KEY",
      };
    }
    const { sentCount, failure } = await sendViaResend(
      resendKey,
      subject,
      html,
      [opts.to.toLowerCase()],
      log
    );
    log.info("digest test send", { to: opts.to, ok: sentCount === 1 });
    return sentCount === 1
      ? {
          sent: true,
          count: selected.length,
          subject,
          pass,
          via: "resend",
          recipients: 1,
          reason: "test send",
        }
      : {
          sent: false,
          count: selected.length,
          subject,
          pass,
          via: "resend",
          reason: "resend error",
          resend: failure,
        };
  }

  // Dry run: everything above (DB read, selection, rendering) executed for
  // real; no email created anywhere. Reports which channel a real send would
  // use and (on the Resend path) how many recipients it would go to.
  if (opts.dryRun) {
    let recipients: number | undefined;
    if (resendKey) {
      try {
        recipients = (await fetchButtondownSubscribers(apiKey, log)).length;
      } catch {
        /* diagnosis only — never fail a dry run on this */
      }
    }
    log.info("digest dry run — send skipped", {
      count: selected.length,
      subject,
      pass,
      via,
      recipients,
      sources: selected.map((c) => c.srcSlug),
    });
    return {
      sent: false,
      count: selected.length,
      subject,
      pass,
      via,
      recipients,
      reason: "dry run",
    };
  }

  // Real sends go through RESEND from our own verified domain — the exact
  // sender identity (From + SPF/DKIM) as the welcome email, which already
  // lands in inboxes. Buttondown's shared sending domain (the free tier's
  // only option) is what kept flagging the digest as spam.
  if (!opts.draft && resendKey) {
    const recipients = await fetchButtondownSubscribers(apiKey, log);
    if (recipients.length === 0) {
      log.warn("digest skipped — no deliverable subscribers");
      return {
        sent: false,
        count: selected.length,
        subject,
        pass,
        via,
        reason: "no subscribers",
      };
    }
    const { sentCount, failure } = await sendViaResend(
      resendKey,
      subject,
      html,
      recipients,
      log
    );
    if (sentCount === 0) {
      return {
        sent: false,
        count: selected.length,
        subject,
        pass,
        via,
        reason: "resend error",
        resend: failure,
      };
    }
    log.info("digest sent via resend", {
      count: selected.length,
      subject,
      pass,
      recipients: sentCount,
    });
    return {
      sent: true,
      count: selected.length,
      subject,
      pass,
      via,
      recipients: sentCount,
    };
  }

  // Buttondown path: ?draft=1 design previews (dashboard render + test sends)
  // and the fallback when RESEND_API_KEY is absent. Buttondown substitutes its
  // own per-recipient unsubscribe variable here.
  const bdHtml = html
    .split(UNSUB_PLACEHOLDER)
    .join("{{ unsubscribe_url }}");

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
      body: bdHtml,
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
      via: "buttondown",
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
      via: "buttondown",
      reason: "draft created",
    };
  }

  log.info("digest sent via buttondown", {
    count: selected.length,
    subject,
    pass,
  });
  return { sent: true, count: selected.length, subject, pass, via: "buttondown" };
}
