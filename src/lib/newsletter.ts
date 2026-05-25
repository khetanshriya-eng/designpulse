/**
 * Daily-digest email content + article selection for Buttondown.
 *
 * We keep this server-only and self-contained — no Supabase types leak into
 * the digest shape, so the email generator can be tested with hand-rolled
 * fixtures.
 */
import "server-only";
import { createPublicClient } from "@/lib/db/client";
import type { ArticleWithSource } from "@/lib/data/adapter";
import { CATEGORY_META } from "@/data/sources";

// Override via NEXT_PUBLIC_SITE_URL once a custom domain is wired up.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://designpulse-app.vercel.app";
const TARGET_ARTICLES = 7;
const POOL_SIZE = 30;
const MAX_PER_CATEGORY = 2;
const MAX_PER_SOURCE = 2;

export type DigestArticle = {
  title: string;
  summary: string;
  originalUrl: string;
  sourceName: string;
  category: string;
  readMinutes: number;
};

/**
 * Pull the digest pool from Supabase. Selection rules:
 *   - Last 24 hours, must have a non-empty summary.
 *   - Sort: is_must_read DESC, is_featured DESC, published_at DESC.
 *   - Filter for variety: ≤2 per category, ≤2 per source.
 *   - Cap at TARGET_ARTICLES items.
 */
export async function getTopArticlesForDigest(): Promise<DigestArticle[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sb = createPublicClient();

  const { data, error } = await sb
    .from("articles")
    .select(
      "title, summary, original_url, category, read_minutes, source_id, is_must_read, is_featured, sources(name)"
    )
    .gte("published_at", since)
    .not("summary", "is", null)
    .neq("summary", "")
    .order("is_must_read", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(POOL_SIZE);

  if (error) throw error;

  const selected: DigestArticle[] = [];
  const categoryCount: Record<string, number> = {};
  const sourceCount: Record<string, number> = {};

  for (const row of (data ?? []) as ArticleWithSource[]) {
    if (selected.length >= TARGET_ARTICLES) break;
    const cat = row.category;
    const src = row.source_id;
    if ((categoryCount[cat] ?? 0) >= MAX_PER_CATEGORY) continue;
    if ((sourceCount[src] ?? 0) >= MAX_PER_SOURCE) continue;

    const sourceRow = Array.isArray(row.sources) ? row.sources[0] : row.sources;

    selected.push({
      title: row.title,
      summary: row.summary ?? "",
      originalUrl: row.original_url,
      sourceName: sourceRow?.name ?? "Unknown",
      category: CATEGORY_META[cat]?.label ?? cat,
      readMinutes: row.read_minutes ?? 3,
    });

    categoryCount[cat] = (categoryCount[cat] ?? 0) + 1;
    sourceCount[src] = (sourceCount[src] ?? 0) + 1;
  }

  return selected;
}

/**
 * Render the digest as Buttondown-friendly Markdown. Buttondown's renderer
 * supports CommonMark, so this stays simple — no HTML, no front matter.
 */
export function generateDigestEmail(
  articles: DigestArticle[],
  prettyDate: string
): { subject: string; body: string } {
  const subject = `DesignPulse — ${prettyDate}`;

  const blocks = articles
    .map((a, i) => {
      const meta = [a.sourceName, a.category, `${a.readMinutes} min read`]
        .filter(Boolean)
        .join(" · ");
      return [
        `### ${i + 1}. ${a.title}`,
        `**${meta}**`,
        "",
        a.summary,
        "",
        `[Read the full article →](${a.originalUrl})`,
        "",
        "---",
      ].join("\n");
    })
    .join("\n\n");

  const body = [
    `# Today's top picks`,
    "",
    `*${articles.length} stories worth your time from today's edition.*`,
    "",
    "---",
    "",
    blocks,
    "",
    `[See today's full edition on DesignPulse →](${SITE_URL})`,
    "",
    `*You're receiving this because you subscribed to DesignPulse — the daily briefing for product designers.*`,
  ].join("\n");

  return { subject, body };
}
