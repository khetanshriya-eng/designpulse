/**
 * Shared fetch pipeline used by the CLI script (`scripts/fetch-feeds.ts`) and
 * the cron API route (`/api/cron/fetch`). Keeping the logic here means the
 * cron handler doesn't shell out — Vercel functions can call it directly.
 *
 * The runner returns a structured result rather than printing, so the caller
 * decides how to render: the CLI uses console.log, the cron route serializes
 * the same shape to JSON.
 */
import { createServiceClient } from "@/lib/db/client";
import { SOURCES } from "@/data/sources";
import { fetchSource, enrichBatch } from "@/lib/fetcher";
import type { SourceRow, ArticleInsert } from "@/lib/db/types";
import type { EnrichedItem } from "@/lib/fetcher";
import { logger, type Logger } from "@/lib/logger";

export type FetchOptions = {
  dryRun?: boolean;
  limit?: number | null;
  only?: string | null;
  /** Optional logger override; defaults to a `cron.fetch`-scoped one. */
  log?: Logger;
};

export type SourceResult = {
  slug: string;
  items: number;
  durationMs: number;
  errors: string[];
};

export type FetchResult = {
  sourcesProcessed: number;
  totalItems: number;
  totalErrors: number;
  inserted: number;
  perSource: SourceResult[];
};

function filterSources(rows: SourceRow[], opts: FetchOptions): SourceRow[] {
  let out = rows;
  if (opts.only) {
    const slugs = opts.only.split(",").map((s) => s.trim());
    out = out.filter((r) => slugs.includes(r.slug));
  } else {
    out = out.filter((r) => r.feed_url || r.youtube_channel_id);
  }
  if (opts.limit) out = out.slice(0, opts.limit);
  return out;
}

async function loadSources(opts: FetchOptions): Promise<SourceRow[]> {
  if (opts.dryRun) {
    const rows: SourceRow[] = SOURCES.map((s) => ({
      id: `dryrun-${s.slug}`,
      slug: s.slug,
      name: s.name,
      url: s.url,
      feed_url: s.feedUrl ?? null,
      type: s.type,
      category: s.category,
      icon_url: null,
      initials: s.initials,
      swatch: s.swatch,
      youtube_channel_id: null,
      is_active: true,
      created_at: "",
      updated_at: "",
    }));
    return filterSources(rows, opts);
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return filterSources((data ?? []) as SourceRow[], opts);
}

function itemToInsert(item: EnrichedItem): ArticleInsert {
  return {
    source_id: item.sourceId,
    title: item.title,
    original_url: item.originalUrl,
    summary: null,
    thumbnail_url: item.thumbnailUrl,
    author: item.author,
    published_at: item.publishedAt,
    read_minutes: item.readMinutes,
    duration_minutes: item.durationMinutes,
    category: item.category,
    content_type: item.contentType,
    is_featured: false,
    is_must_read: false,
    raw_content: item.rawContent,
    content_hash: null,
  };
}

export async function runFetch(opts: FetchOptions = {}): Promise<FetchResult> {
  const log = opts.log ?? logger("pipeline.fetch");
  const sources = await loadSources(opts);
  log.info("starting", {
    sources: sources.length,
    dryRun: opts.dryRun ?? false,
    only: opts.only ?? null,
    limit: opts.limit ?? null,
  });

  let totalItems = 0;
  let totalErrors = 0;
  const perSource: SourceResult[] = [];
  const allInserts: ArticleInsert[] = [];

  for (const source of sources) {
    const result = await fetchSource(source);
    if (result.errors.length) {
      totalErrors += result.errors.length;
      for (const e of result.errors) log.warn("source error", { slug: source.slug, error: e });
    }
    if (result.items.length === 0) {
      perSource.push({ slug: source.slug, items: 0, durationMs: result.durationMs, errors: result.errors });
      log.debug("empty source", { slug: source.slug, durationMs: result.durationMs });
      continue;
    }

    const enriched = await enrichBatch(result.items, 4);
    totalItems += enriched.length;
    perSource.push({
      slug: source.slug,
      items: enriched.length,
      durationMs: result.durationMs,
      errors: result.errors,
    });
    log.info("source fetched", {
      slug: source.slug,
      items: enriched.length,
      durationMs: result.durationMs,
    });

    if (!opts.dryRun) {
      allInserts.push(...enriched.map(itemToInsert));
    }
  }

  let inserted = 0;
  if (!opts.dryRun && allInserts.length > 0) {
    const supabase = createServiceClient();
    const CHUNK = 50;
    for (let i = 0; i < allInserts.length; i += CHUNK) {
      const chunk = allInserts.slice(i, i + CHUNK);
      const { error, count } = await supabase
        .from("articles")
        .upsert(chunk, {
          onConflict: "original_url",
          count: "exact",
          ignoreDuplicates: true,
        });
      if (error) {
        log.error("insert failed", { error: error.message });
        throw new Error(`articles upsert failed: ${error.message}`);
      }
      inserted += count ?? 0;
    }
    log.info("insert complete", { inserted, fetched: allInserts.length });
  }

  log.info("done", {
    sourcesProcessed: sources.length,
    totalItems,
    totalErrors,
    inserted,
  });

  return {
    sourcesProcessed: sources.length,
    totalItems,
    totalErrors,
    inserted,
    perSource,
  };
}
