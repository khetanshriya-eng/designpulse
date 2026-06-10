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
import { unstable_cache } from "next/cache";
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

/*
 * Page-level caching: all the read queries below are wrapped in
 * unstable_cache(revalidate: 600). Content only changes when the cron
 * pipeline runs (02:30 / 14:30 UTC), so 10-minute staleness is invisible —
 * but it collapses the ~13 Supabase round-trips a cold homepage render used
 * to make into cache reads (QA audit 2026-06-10: TTFB 1–3s → target <600ms).
 * Cache keys include function args, so per-date / per-category entries are
 * distinct.
 */
export const getEdition = unstable_cache(
  async (date?: string): Promise<EditionView | null> => {
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

    const [hero, pick] = await Promise.all([
      ed.hero_article_id ? getArticleById(ed.hero_article_id) : Promise.resolve(null),
      ed.editors_pick_id ? getArticleById(ed.editors_pick_id) : Promise.resolve(null),
    ]);

    // Must-read renders as 1 large + 4 stacked = 5. Exclude hero/pick so they
    // never repeat, and backfill (inside getMustReads) so the section is always
    // full — never a half-empty column.
    const excludeIds = [hero?.id, pick?.id].filter((x): x is string => !!x);
    const mr = await getMustReads(5, excludeIds);

    return {
      date: ed.edition_date,
      hero,
      editorsPick: pick,
      mustReads: mr,
    };
  },
  ["edition-view"],
  { revalidate: 600 }
);

/**
 * Edition dates available in the DB, newest first.
 *
 * Cached (10 min): this + getArticleCount + getRecentHeadlines run on EVERY
 * navigation via the root-layout <Navigation>, so caching them is the biggest
 * tab-to-tab / page-to-page speedup — each navigation then only pays for the
 * page's own query. Data changes twice daily, so 10-min staleness is fine.
 */
export const listEditionDates = unstable_cache(
  async (limit = 30): Promise<string[]> => {
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("editions")
      .select("edition_date")
      .order("edition_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => r.edition_date);
  },
  ["edition-dates"],
  { revalidate: 600 }
);

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

/**
 * Curated must-reads, backfilled to `limit` so the homepage section is always
 * full (1 large + 4 stacked). Curated picks (is_must_read) come first; if the
 * curator flagged fewer than `limit`, recent summarized articles fill the rest
 * (still good articles, just not hand-picked). Excludes `excludeIds` (hero +
 * editor's pick) so nothing repeats.
 */
export async function getMustReads(
  limit = 5,
  excludeIds: string[] = []
): Promise<Article[]> {
  const sb = createPublicClient();
  let q = sb
    .from("articles")
    .select(SELECT)
    .eq("is_must_read", true)
    .not("summary", "is", null)
    .neq("summary", "")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit + excludeIds.length);
  if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
  const { data, error } = await q;
  if (error) throw error;

  const picked = ((data ?? []) as ArticleWithSource[]).filter(
    (r) => !excludeIds.includes(r.id)
  );

  // Backfill from recent articles if the curator under-filled.
  if (picked.length < limit) {
    const haveIds = new Set<string>([...excludeIds, ...picked.map((r) => r.id)]);
    const pool = await fetchLatestPool(limit * 5, [...haveIds], 30);
    for (const row of pool) {
      if (picked.length >= limit) break;
      if (haveIds.has(row.id)) continue;
      picked.push(row);
      haveIds.add(row.id);
    }
  }

  return rowsToArticles(picked.slice(0, limit));
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
 * Most recent N articles with a real summary. Used for the "Latest" grid
 * on the homepage. Three layered constraints, in order:
 *
 *   1. Recency window: only articles published in the last 7 days are
 *      eligible. The section literally claims to be "latest", so a
 *      10-day-old Prototypr entry doesn't belong even if it's the
 *      newest thing the DB has.
 *   2. Source diversity: at most 2 articles per source, so one busy
 *      feed can't dominate the grid.
 *   3. Hero/editor's-pick exclusion via `excludeIds`.
 *
 * If the 7-day window yields fewer than `limit` items, we expand to 14
 * then 30 days so the section still renders something rather than
 * collapsing to nothing on slow news weeks. The kicker/description above
 * the section is computed separately from the actual ages and will say
 * "Recent highlights" instead of "Fresh from the past 24 hours" when
 * the data is older.
 */
export const getLatest = unstable_cache(
  async (limit = 6, excludeIds: string[] = []): Promise<Article[]> => {
    const windows = [7, 14, 30]; // days, in order of preference
    for (const days of windows) {
      const pool = await fetchLatestPool(limit * 5, excludeIds, days);
      const picked = diversifyBySource(pool, limit, 2);
      if (picked.length >= limit) {
        return rowsToArticles(picked);
      }
    }
    // Even with a 30-day window we can't fill the slot. Return whatever we
    // have rather than nothing.
    const pool = await fetchLatestPool(limit * 5, excludeIds, 30);
    return rowsToArticles(diversifyBySource(pool, limit, 2));
  },
  ["latest-articles"],
  { revalidate: 600 }
);

async function fetchLatestPool(
  poolSize: number,
  excludeIds: string[],
  withinDays: number
): Promise<ArticleWithSource[]> {
  const sb = createPublicClient();
  const cutoff = new Date(Date.now() - withinDays * 24 * 3600 * 1000).toISOString();
  let q = sb
    .from("articles")
    .select(SELECT)
    .not("summary", "is", null)
    .neq("summary", "")
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(Math.max(poolSize, 30) + excludeIds.length);
  if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ArticleWithSource[];
}

/**
 * Top N from one category — used by the homepage's category pairs.
 * Diversifies by source (max 1 per source) so a 2-card preview shows
 * articles from two distinct sources rather than two from the same one.
 */
export const getByCategory = unstable_cache(
  async (
    category: SourceCategory,
    limit = 2,
    excludeIds: string[] = []
  ): Promise<Article[]> => {
    const sb = createPublicClient();
    const poolSize = Math.max(limit * 6, 18);
    let q = sb
      .from("articles")
      .select(SELECT)
      .eq("category", category)
      .not("summary", "is", null)
      .neq("summary", "")
      // nullsFirst:false keeps dated (fresh) articles in the lead and lets
      // null-dated ones backfill the tail — so a thin category still fills its
      // 2-card preview rather than showing a lonely single card, while the
      // lead card is never a stale fetched_at fallback.
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(poolSize + excludeIds.length);
    if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);

    const { data, error } = await q;
    if (error) throw error;
    const pool = (data ?? []) as ArticleWithSource[];
    // Category previews show 2 cards — keep them from different sources.
    return rowsToArticles(diversifyBySource(pool, limit, 1));
  },
  ["by-category"],
  { revalidate: 600 }
);

/**
 * Lightweight recent headlines (title + url only) for the nav marquee ticker.
 * Dated, summarized articles, newest first.
 */
export const getRecentHeadlines = unstable_cache(
  async (limit = 15): Promise<{ title: string; url: string }[]> => {
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("articles")
      .select("title, original_url")
      .not("summary", "is", null)
      .neq("summary", "")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as { title: string; original_url: string }[]).map(
      (r) => ({ title: r.title, url: r.original_url })
    );
  },
  ["recent-headlines"],
  { revalidate: 600 }
);

/** Full category page — bigger N, paginated by offset. Cached per page. */
export const getCategoryPage = unstable_cache(
  async (
    category: SourceCategory,
    opts: { limit?: number; offset?: number } = {}
  ): Promise<{ items: Article[]; total: number }> => {
    const sb = createPublicClient();
    const limit = opts.limit ?? 24;
    const offset = opts.offset ?? 0;

    const { data, count, error } = await sb
      .from("articles")
      .select(SELECT, { count: "exact" })
      .eq("category", category)
      .not("summary", "is", null)
      .neq("summary", "")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return {
      items: rowsToArticles((data ?? []) as ArticleWithSource[]),
      total: count ?? 0,
    };
  },
  ["category-page"],
  { revalidate: 600 }
);

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
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return rowsToArticles((data ?? []) as ArticleWithSource[]);
}

/** Total article count for the nav "N stories curated" meter. Cached (10 min). */
export const getArticleCount = unstable_cache(
  async (): Promise<number> => {
    const sb = createPublicClient();
    const { count, error } = await sb
      .from("articles")
      .select("*", { count: "exact", head: true })
      .not("summary", "is", null)
      .neq("summary", "");
    if (error) throw error;
    return count ?? 0;
  },
  ["article-count"],
  { revalidate: 600 }
);
