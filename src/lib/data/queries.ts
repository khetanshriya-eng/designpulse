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
import { isOffBrand } from "@/lib/content/filter";
import { sourcePriority } from "@/data/sources";
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
      // An explicitly-requested date must exist — no fallback. Otherwise
      // /edition/<any-garbage-date> would silently render the latest edition
      // (duplicate content under infinite URLs; QA audit 2026-06-10).
      const res = await sb
        .from("editions")
        .select("*")
        .eq("edition_date", date)
        .maybeSingle();
      if (res.error) throw res.error;
      ed = res.data;
      if (!ed) return null;
    } else {
      // No date requested (homepage): most recent edition.
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
    .not("title", "is", null)
    .neq("title", "")
    .not("title", "ilike", "http%")
    .not("title", "ilike", "www.%")
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
      const pool = await fetchLatestPool(limit * 6, excludeIds, days);
      const picked = balanceByCategory(pool, limit);
      if (picked.length >= limit) {
        return rowsToArticles(picked);
      }
    }
    // Even with a 30-day window we can't fill the slot. Return whatever we
    // have rather than nothing.
    const pool = await fetchLatestPool(limit * 6, excludeIds, 30);
    return rowsToArticles(balanceByCategory(pool, limit));
  },
  ["latest-articles"],
  { revalidate: 600 }
);

/**
 * Every displayable article from ONE edition's era. This is what pins an
 * edition page to its own moment in time: an edition from last month shows
 * last month's stories, never today's. (getLatest, by contrast, is
 * date-agnostic and only belongs on the homepage.)
 *
 * The window is the 48h ENDING at the end of the edition date — an edition
 * curated at 02:30 UTC on day D is mostly built from stories published on
 * D-1, so a literal calendar-day window starved the category sections on
 * every past edition (they only cleared the 2-story bar for "today", where
 * publishing is still in progress).
 */
export const getArticlesForDay = unstable_cache(
  async (date: string, limit = 80): Promise<Article[]> => {
    const dayStartMs = Date.parse(`${date}T00:00:00Z`);
    const windowStart = new Date(dayStartMs - 24 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(dayStartMs + 24 * 60 * 60 * 1000).toISOString();
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("articles")
      .select(SELECT)
      .gte("published_at", windowStart)
      .lt("published_at", windowEnd)
      .not("summary", "is", null)
      .neq("summary", "")
      .not("title", "is", null)
      .neq("title", "")
      .not("title", "ilike", "http%")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    const rows = ((data ?? []) as ArticleWithSource[]).filter(
      (r) => !isOffBrand(r.title ?? "", r.original_url ?? "")
    );
    return rowsToArticles(rows);
  },
  ["articles-for-day"],
  { revalidate: 600 }
);

/**
 * Balance a recency-sorted pool across categories so one high-volume category
 * (esp. tech-news) can't flood the "Latest" grid. Round-robin: take the
 * freshest of each category, then the second-freshest, etc., capped at
 * `maxPerCategory`. Design-leaning: tier-3 (tech-news) categories fill last,
 * so the grid leads with design/product/AI and only shows tech if slots
 * remain. The result is re-sorted newest-first so it still reads as "latest".
 */
function balanceByCategory(
  pool: ArticleWithSource[],
  limit: number,
  maxPerCategory = 2
): ArticleWithSource[] {
  const byCat = new Map<string, ArticleWithSource[]>();
  for (const row of pool) {
    const arr = byCat.get(row.category) ?? [];
    arr.push(row); // pool already newest-first, so each list is too
    byCat.set(row.category, arr);
  }
  const freshness = (r: ArticleWithSource) =>
    new Date(r.published_at ?? 0).getTime();
  const cats = [...byCat.keys()].sort((a, b) => {
    // tech-news (the only tier-3 category) always sorts last.
    const at = a === "tech-news" ? 1 : 0;
    const bt = b === "tech-news" ? 1 : 0;
    if (at !== bt) return at - bt;
    return freshness(byCat.get(b)![0]) - freshness(byCat.get(a)![0]);
  });

  const picked: ArticleWithSource[] = [];
  for (let round = 0; round < maxPerCategory && picked.length < limit; round++) {
    for (const cat of cats) {
      const item = byCat.get(cat)![round];
      if (item) {
        picked.push(item);
        if (picked.length >= limit) break;
      }
    }
  }
  // Backfill from the rest of the pool (recency order) if still short.
  if (picked.length < limit) {
    const have = new Set(picked.map((p) => p.id));
    for (const row of pool) {
      if (picked.length >= limit) break;
      if (!have.has(row.id)) {
        picked.push(row);
        have.add(row.id);
      }
    }
  }
  // Re-sort newest-first so the section still reads as "latest".
  return picked.sort((a, b) => freshness(b) - freshness(a)).slice(0, limit);
}

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
    // Title guards: never surface a broken "raw URL" card (no/empty/url title).
    .not("title", "is", null)
    .neq("title", "")
    .not("title", "ilike", "http%")
    .not("title", "ilike", "www.%")
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(Math.max(poolSize, 30) + excludeIds.length);
  if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
  const { data, error } = await q;
  if (error) throw error;
  // Content filter: drop off-brand deal/listicle/gadget items from the feed
  // pool (this helper backs both getLatest and the must-read backfill).
  return ((data ?? []) as ArticleWithSource[]).filter(
    (r) => !isOffBrand(r.title, r.original_url)
  );
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
      .not("title", "is", null)
      .neq("title", "")
      .not("title", "ilike", "http%")
      .not("title", "ilike", "www.%")
      // nullsFirst:false keeps dated (fresh) articles in the lead and lets
      // null-dated ones backfill the tail — so a thin category still fills its
      // 2-card preview rather than showing a lonely single card, while the
      // lead card is never a stale fetched_at fallback.
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(poolSize + excludeIds.length);
    if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);

    const { data, error } = await q;
    if (error) throw error;
    const pool = ((data ?? []) as ArticleWithSource[]).filter(
      (r) => !isOffBrand(r.title, r.original_url)
    );
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
      .select("title, original_url, sources(slug)")
      .not("summary", "is", null)
      .neq("summary", "")
      .not("title", "is", null)
      .neq("title", "")
      .not("title", "ilike", "http%")
      .not("title", "ilike", "www.%")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      // Fetch a deep recent pool so the design-only filter has plenty to pick.
      .limit(150);
    if (error) throw error;

    type Row = {
      title: string;
      original_url: string;
      sources: { slug: string } | { slug: string }[] | null;
    };
    const rows = (data ?? []) as Row[];
    const slugOf = (r: Row) =>
      Array.isArray(r.sources) ? r.sources[0]?.slug : r.sources?.slug;

    // The ticker is the first thing on every page — make it a pure DESIGN
    // signal: tier-1 (design) sources ONLY. No tech-news/business/AI, even if
    // that means a shorter ticker (it loops). Off-brand deal items excluded.
    const picked = rows.filter((r) => {
      if (isOffBrand(r.title, r.original_url)) return false;
      const s = slugOf(r);
      return s ? sourcePriority(s) === 1 : false;
    });
    return picked
      .slice(0, limit)
      .map((r) => ({ title: r.title, url: r.original_url }));
  },
  ["recent-headlines-design"],
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
      .not("title", "is", null)
      .neq("title", "")
      .not("title", "ilike", "http%")
      .not("title", "ilike", "www.%")
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
 * Article search. Prefers Postgres full-text search against the generated
 * `fts` column (title weighted above summary, AND + prefix semantics), and
 * falls back to ILIKE substring matching when `fts` doesn't exist yet
 * (i.e. before migration 0002 runs) or if the tsquery errors. This makes the
 * upgrade deploy-safe: search works the same before and after the migration,
 * just better once `fts` is present.
 */
export async function searchArticles(
  query: string,
  limit = 20
): Promise<Article[]> {
  // Unicode word tokens only — strips every tsquery/ILIKE metacharacter so
  // user input can never break the query (data is public, so this is about
  // robustness, not confidentiality).
  const terms = (query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 12);
  if (terms.length === 0) return [];

  const sb = createPublicClient();

  // 1) Full-text search. Prefix-match each term ("desig" → "design") and AND
  //    them together, so "design system" needs both words.
  const tsquery = terms.map((t) => `${t}:*`).join(" & ");
  const fts = await sb
    .from("articles")
    .select(SELECT)
    .not("summary", "is", null)
    .neq("summary", "")
    .not("title", "is", null)
    .neq("title", "")
    .not("title", "ilike", "http%")
    .textSearch("fts", tsquery, { config: "english" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!fts.error) {
    return rowsToArticles((fts.data ?? []) as ArticleWithSource[]);
  }

  // 2) ILIKE fallback (no fts column yet). Match the joined phrase as a
  //    substring across title + summary.
  const pattern = `%${terms.join(" ").replace(/[%_]/g, "\\$&")}%`;
  const { data, error } = await sb
    .from("articles")
    .select(SELECT)
    .not("summary", "is", null)
    .neq("summary", "")
    .not("title", "is", null)
    .neq("title", "")
    .not("title", "ilike", "http%")
    .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return rowsToArticles((data ?? []) as ArticleWithSource[]);
}

/**
 * Recent curated articles for Designator's own RSS feed (/api/rss). Straight
 * recency (no category balancing) — an RSS reader wants the latest, in order.
 * Title-guarded + content-filtered like every other display surface.
 */
export const getFeedArticles = unstable_cache(
  async (limit = 30): Promise<Article[]> => {
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("articles")
      .select(SELECT)
      .not("summary", "is", null)
      .neq("summary", "")
      .not("title", "is", null)
      .neq("title", "")
      .not("title", "ilike", "http%")
      .not("title", "ilike", "www.%")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit * 2); // over-fetch so the content filter can't starve it
    if (error) throw error;
    return rowsToArticles(
      ((data ?? []) as ArticleWithSource[])
        .filter((r) => !isOffBrand(r.title, r.original_url))
        .slice(0, limit)
    );
  },
  ["feed-articles"],
  { revalidate: 600 }
);

/**
 * Past editions for /archive — straight off the real `editions` table (so the
 * links always resolve, unlike grouping articles by published date). Each entry
 * carries the hero's title + source and a story count (articles published that
 * UTC day, as a "how busy was that day" proxy). Paginated.
 */
export type ArchiveEdition = {
  date: string;
  count: number;
  heroTitle: string | null;
  heroSource: string | null;
};

export const getArchiveEditions = unstable_cache(
  async (
    limit = 20,
    offset = 0
  ): Promise<{ editions: ArchiveEdition[]; total: number }> => {
    const sb = createPublicClient();
    const { data, count, error } = await sb
      .from("editions")
      .select("edition_date, hero_article_id", { count: "exact" })
      .order("edition_date", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    const rows = (data ?? []) as {
      edition_date: string;
      hero_article_id: string | null;
    }[];

    // Batch-fetch hero title + source name for the rows on this page.
    const heroIds = rows
      .map((r) => r.hero_article_id)
      .filter((x): x is string => !!x);
    const heroMap = new Map<string, { title: string; source: string | null }>();
    if (heroIds.length) {
      const { data: heroes } = await sb
        .from("articles")
        .select("id, title, sources(name)")
        .in("id", heroIds);
      for (const h of (heroes ?? []) as {
        id: string;
        title: string;
        sources: { name: string } | { name: string }[] | null;
      }[]) {
        const s = Array.isArray(h.sources) ? h.sources[0] : h.sources;
        heroMap.set(h.id, { title: h.title, source: s?.name ?? null });
      }
    }

    // Per-edition story count (parallel, cheap head:count queries).
    const counts = await Promise.all(
      rows.map(async (r) => {
        const { count: c } = await sb
          .from("articles")
          .select("*", { count: "exact", head: true })
          .not("summary", "is", null)
          .neq("summary", "")
          .not("title", "is", null)
          .not("title", "ilike", "http%")
          .gte("published_at", `${r.edition_date}T00:00:00.000Z`)
          .lte("published_at", `${r.edition_date}T23:59:59.999Z`);
        return c ?? 0;
      })
    );

    const editions: ArchiveEdition[] = rows.map((r, i) => {
      const hero = r.hero_article_id ? heroMap.get(r.hero_article_id) : null;
      return {
        date: r.edition_date,
        count: counts[i],
        heroTitle: hero?.title ?? null,
        heroSource: hero?.source ?? null,
      };
    });
    return { editions, total: count ?? 0 };
  },
  ["archive-editions"],
  { revalidate: 600 }
);

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
