/**
 * Server-side data access. Every function returns UI-shaped `Article` objects
 * (via the adapter) so pages can stay close to their original layout code.
 *
 * Caching: all queries are server-side and called from React Server Components.
 * We rely on Next.js's default per-request memoization; no global cache.
 *
 * NULL summaries are excluded everywhere by default — an article without a
 * summary isn't ready to be shown to a reader. The summarizer fills these in.
 */
import "server-only";
import { createPublicClient } from "@/lib/db/client";
import type { SourceCategory } from "@/data/sources";
import {
  rowsToArticles,
  rowToArticle,
  type ArticleWithSource,
} from "./adapter";
import type { Article } from "@/data/articles";

const SELECT = "*, sources(*)";

/**
 * Get the daily edition: hero, editor's pick, must-reads, plus a fallback
 * date so the UI knows what to display.
 *
 * If no edition row exists for `date`, we fall back to the most recent one.
 * Hero & editor's pick come from the edition row's foreign keys; must-reads
 * are pulled by `is_must_read = true` (auto-curation flags these globally,
 * so we read the current set rather than per-edition).
 */
export type EditionView = {
  date: string;
  hero: Article | null;
  editorsPick: Article | null;
  mustReads: Article[];
};

export async function getEdition(date?: string): Promise<EditionView | null> {
  const sb = createPublicClient();

  let ed;
  if (date) {
    const res = await sb
      .from("editions")
      .select("*")
      .eq("edition_date", date)
      .maybeSingle();
    if (res.error) throw res.error;
    ed = res.data;
  }
  if (!ed) {
    const res = await sb
      .from("editions")
      .select("*")
      .order("edition_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (res.error) throw res.error;
    ed = res.data;
  }
  if (!ed) return null;

  const [hero, pick, mr] = await Promise.all([
    ed.hero_article_id ? getArticleById(ed.hero_article_id) : Promise.resolve(null),
    ed.editors_pick_id ? getArticleById(ed.editors_pick_id) : Promise.resolve(null),
    getMustReads(6),
  ]);

  return {
    date: ed.edition_date,
    hero,
    editorsPick: pick,
    mustReads: mr,
  };
}

/** Edition dates available in the DB, newest first — used by the date picker. */
export async function listEditionDates(limit = 30): Promise<string[]> {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("editions")
    .select("edition_date")
    .order("edition_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.edition_date);
}

async function getArticleById(id: string): Promise<Article | null> {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("articles")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToArticle(data as ArticleWithSource);
}

export async function getMustReads(limit = 5): Promise<Article[]> {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("articles")
    .select(SELECT)
    .eq("is_must_read", true)
    .not("summary", "is", null)
    .neq("summary", "")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return rowsToArticles((data ?? []) as ArticleWithSource[]);
}

/**
 * Pick `limit` articles from `pool` while enforcing at most `maxPerSource`
 * items from any single source. Pool is assumed to be ordered by recency
 * (newest first). The first pass takes the newest of each source until
 * we hit the per-source cap; a second pass fills any remaining slots from
 * the leftovers. This way a busy source (e.g. Prototypr publishing 12
 * items in one day) can't crowd out fresher items from other sources,
 * but the result is still ordered by recency.
 */
function diversifyBySource(
  pool: ArticleWithSource[],
  limit: number,
  maxPerSource = 2
): ArticleWithSource[] {
  const picked: ArticleWithSource[] = [];
  const perSource = new Map<string, number>();
  const leftovers: ArticleWithSource[] = [];

  for (const row of pool) {
    const sourceId = row.source_id ?? "unknown";
    const count = perSource.get(sourceId) ?? 0;
    if (count < maxPerSource) {
      picked.push(row);
      perSource.set(sourceId, count + 1);
      if (picked.length >= limit) return picked;
    } else {
      leftovers.push(row);
    }
  }
  // Backfill if we under-filled because the pool was too small or too
  // source-concentrated.
  for (const row of leftovers) {
    if (picked.length >= limit) break;
    picked.push(row);
  }
  return picked;
}

/**
 * Most recent N articles with a real summary. Used for the "Latest" grid on
 * the homepage. Excludes the IDs in `excludeIds` so we don't repeat the hero
 * or editor's pick. Enforces source diversity — at most 2 articles from
 * any single source.
 */
export async function getLatest(
  limit = 6,
  excludeIds: string[] = []
): Promise<Article[]> {
  const sb = createPublicClient();
  // Pull a wider pool than `limit` so diversification has options to choose
  // from. ~5x the target is plenty for ~65 active sources.
  const poolSize = Math.max(limit * 5, 30);
  let q = sb
    .from("articles")
    .select(SELECT)
    .not("summary", "is", null)
    .neq("summary", "")
    .order("published_at", { ascending: false })
    .limit(poolSize + excludeIds.length);
  if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);

  const { data, error } = await q;
  if (error) throw error;
  const pool = (data ?? []) as ArticleWithSource[];
  return rowsToArticles(diversifyBySource(pool, limit, 2));
}

/**
 * Top N from one category — used by the homepage's category pairs.
 * Diversifies by source (max 1 per source) so a 2-card preview shows
 * articles from two distinct sources rather than two from the same one.
 */
export async function getByCategory(
  category: SourceCategory,
  limit = 2,
  excludeIds: string[] = []
): Promise<Article[]> {
  const sb = createPublicClient();
  const poolSize = Math.max(limit * 6, 18);
  let q = sb
    .from("articles")
    .select(SELECT)
    .eq("category", category)
    .not("summary", "is", null)
    .neq("summary", "")
    .order("published_at", { ascending: false })
    .limit(poolSize + excludeIds.length);
  if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);

  const { data, error } = await q;
  if (error) throw error;
  const pool = (data ?? []) as ArticleWithSource[];
  // Category previews show 2 cards — keep them from different sources.
  return rowsToArticles(diversifyBySource(pool, limit, 1));
}

/** Full category page — bigger N, paginated by offset. */
export async function getCategoryPage(
  category: SourceCategory,
  opts: { limit?: number; offset?: number } = {}
): Promise<{ items: Article[]; total: number }> {
  const sb = createPublicClient();
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;

  const { data, count, error } = await sb
    .from("articles")
    .select(SELECT, { count: "exact" })
    .eq("category", category)
    .not("summary", "is", null)
    .neq("summary", "")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: rowsToArticles((data ?? []) as ArticleWithSource[]),
    total: count ?? 0,
  };
}

/**
 * Full-text-ish search. Postgres has proper FTS but we haven't set up a
 * tsvector column yet, so this uses an OR of ILIKE matches on title and
 * summary. Good enough for a few hundred rows; we'll upgrade once volume
 * warrants it.
 */
export async function searchArticles(
  query: string,
  limit = 20
): Promise<Article[]> {
  const q = query.trim();
  if (!q) return [];
  // Escape the % and _ wildcards a user might type so they don't match weirdly.
  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;

  const sb = createPublicClient();
  const { data, error } = await sb
    .from("articles")
    .select(SELECT)
    .not("summary", "is", null)
    .neq("summary", "")
    .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return rowsToArticles((data ?? []) as ArticleWithSource[]);
}

/** Total article count for the edition strap copy ("N stories curated"). */
export async function getArticleCount(): Promise<number> {
  const sb = createPublicClient();
  const { count, error } = await sb
    .from("articles")
    .select("*", { count: "exact", head: true })
    .not("summary", "is", null)
    .neq("summary", "");
  if (error) throw error;
  return count ?? 0;
}
