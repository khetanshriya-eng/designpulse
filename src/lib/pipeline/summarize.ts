/**
 * Shared summarize pipeline used by `scripts/summarize.ts` and
 * `/api/cron/summarize`. See pipeline/fetch.ts for the design rationale.
 */
import { createServiceClient } from "@/lib/db/client";
import type { ArticleRow } from "@/lib/db/types";
import { summarizeArticle } from "@/lib/ai/summarize";
import { logger, type Logger } from "@/lib/logger";
import { sourcePriority } from "@/data/sources";
import { isOffBrand } from "@/lib/content/filter";

export type SummarizeOptions = {
  limit?: number;
  concurrency?: number;
  dryRun?: boolean;
  slug?: string;
  log?: Logger;
};

export type SummarizeResult = {
  processed: number;
  ok: number;
  skipped: number;
  failed: number;
  providerCounts: Record<string, number>;
};

type Pickable = Pick<
  ArticleRow,
  "id" | "title" | "raw_content" | "source_id" | "published_at"
> & { source_name: string };

/** Recent window that matters: curate and the digest only look back 48h. */
const PRIORITY_WINDOW_MS = 48 * 3_600_000;
/** How many recent unsummarized rows to rank per run (cheap: no bodies). */
const PRIORITY_POOL = 300;
/** Source types curate never features (see curate/pick.ts FORBIDDEN_TYPES). */
const UNFEATURABLE_TYPES = new Set(["forum", "gallery"]);

type CandidateRow = Pick<ArticleRow, "id" | "title" | "raw_content" | "source_id" | "published_at" | "original_url"> & {
  sources: SourceJoin | SourceJoin[];
};
type SourceJoin = { name: string; slug: string; type: string };

function toPickable(r: CandidateRow): Pickable & { slug: string; type: string; url: string } {
  const src = Array.isArray(r.sources) ? r.sources[0] : r.sources;
  return {
    id: r.id,
    title: r.title,
    raw_content: r.raw_content,
    source_id: r.source_id,
    published_at: r.published_at,
    source_name: src?.name ?? "Unknown",
    slug: src?.slug ?? "",
    type: src?.type ?? "",
    url: r.original_url,
  };
}

/**
 * Pick what to summarize this run. Free-tier AI throughput (~30/day) is far
 * below inflow (40–180/day), so plain newest-first spent much of the budget
 * on items that can never be featured (tier-3 tech news, forum/gallery posts,
 * off-brand listicles) while featurable design stories waited, which is why
 * thin mornings ran short of summarized candidates. Now, within the 48h
 * window curate and the digest actually use: featurable items first (tier 1,
 * then tier 2), then the rest of the window, newest first within each group;
 * any remaining budget falls back to older backlog, newest first.
 */
async function loadCandidates(opts: Required<Pick<SummarizeOptions, "limit">> & SummarizeOptions): Promise<Pickable[]> {
  const supabase = createServiceClient();
  const cols = "id, title, raw_content, source_id, published_at, original_url, sources!inner(name, slug, type)";
  const since = new Date(Date.now() - PRIORITY_WINDOW_MS).toISOString();

  let recentQ = supabase
    .from("articles")
    .select(cols)
    .is("summary", null)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(PRIORITY_POOL);
  if (opts.slug) recentQ = recentQ.eq("sources.slug", opts.slug);
  const { data: recentData, error: recentErr } = await recentQ;
  if (recentErr) throw recentErr;

  // Rank: 0 = featurable tier 1, 1 = featurable tier 2, 2 = everything else.
  const rank = (a: ReturnType<typeof toPickable>): number => {
    const tier = sourcePriority(a.slug);
    const featurable =
      tier <= 2 && !UNFEATURABLE_TYPES.has(a.type) && !isOffBrand(a.title, a.url);
    return featurable ? tier - 1 : 2;
  };
  const recent = ((recentData ?? []) as CandidateRow[])
    .map(toPickable)
    .map((a, i) => ({ a, r: rank(a), i })) // i keeps newest-first within a rank
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((x) => x.a)
    .slice(0, opts.limit);

  if (recent.length >= opts.limit) return recent;

  // Budget left: older backlog, newest first.
  let olderQ = supabase
    .from("articles")
    .select(cols)
    .is("summary", null)
    .lt("published_at", since)
    .order("published_at", { ascending: false })
    .limit(opts.limit - recent.length);
  if (opts.slug) olderQ = olderQ.eq("sources.slug", opts.slug);
  const { data: olderData, error: olderErr } = await olderQ;
  if (olderErr) throw olderErr;
  return [...recent, ...((olderData ?? []) as CandidateRow[]).map(toPickable)];
}

export async function runSummarize(opts: SummarizeOptions = {}): Promise<SummarizeResult> {
  const log = opts.log ?? logger("pipeline.summarize");
  const limit = opts.limit ?? 50;
  const concurrency = opts.concurrency ?? 3;
  const dryRun = opts.dryRun ?? false;

  const supabase = createServiceClient();
  const rows = await loadCandidates({ ...opts, limit });

  log.info("starting", {
    candidates: rows.length,
    concurrency,
    dryRun,
    slug: opts.slug ?? null,
  });

  if (rows.length === 0) {
    log.info("nothing to do");
    return { processed: 0, ok: 0, skipped: 0, failed: 0, providerCounts: {} };
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const providerCounts: Record<string, number> = {};

  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= rows.length) return;
      const r = rows[i];
      const outcome = await summarizeArticle({
        title: r.title,
        sourceName: r.source_name,
        rawContent: r.raw_content,
      });

      if (!outcome.ok) {
        failed++;
        log.warn("summarize failed", {
          id: r.id,
          source: r.source_name,
          title: r.title.slice(0, 80),
          attempts: outcome.attempts,
        });
        continue;
      }

      if (outcome.skipped) {
        skipped++;
        providerCounts[outcome.provider] = (providerCounts[outcome.provider] ?? 0) + 1;
        if (!dryRun) {
          await supabase.from("articles").update({ summary: "" }).eq("id", r.id);
        }
        log.info("skipped", { id: r.id, provider: outcome.provider });
        continue;
      }

      ok++;
      providerCounts[outcome.provider] = (providerCounts[outcome.provider] ?? 0) + 1;
      if (!dryRun) {
        const { error } = await supabase
          .from("articles")
          .update({ summary: outcome.summary })
          .eq("id", r.id);
        if (error) {
          log.warn("db update failed", { id: r.id, error: error.message });
        }
      }
      log.debug("summarized", { id: r.id, provider: outcome.provider });
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, rows.length)) }, worker)
  );

  log.info("done", { processed: rows.length, ok, skipped, failed, providerCounts });

  return { processed: rows.length, ok, skipped, failed, providerCounts };
}
