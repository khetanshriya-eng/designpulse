/**
 * Shared summarize pipeline used by `scripts/summarize.ts` and
 * `/api/cron/summarize`. See pipeline/fetch.ts for the design rationale.
 */
import { createServiceClient } from "@/lib/db/client";
import type { ArticleRow } from "@/lib/db/types";
import { summarizeArticle } from "@/lib/ai/summarize";
import { logger, type Logger } from "@/lib/logger";

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

async function loadCandidates(opts: Required<Pick<SummarizeOptions, "limit">> & SummarizeOptions): Promise<Pickable[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("articles")
    .select("id, title, raw_content, source_id, published_at, sources!inner(name, slug)")
    .is("summary", null)
    .order("published_at", { ascending: false })
    .limit(opts.limit);
  if (opts.slug) q = q.eq("sources.slug", opts.slug);
  const { data, error } = await q;
  if (error) throw error;

  type Row = Pick<ArticleRow, "id" | "title" | "raw_content" | "source_id" | "published_at"> & {
    sources: { name: string; slug: string } | { name: string; slug: string }[];
  };
  return ((data ?? []) as Row[]).map((r) => {
    const src = Array.isArray(r.sources) ? r.sources[0] : r.sources;
    return {
      id: r.id,
      title: r.title,
      raw_content: r.raw_content,
      source_id: r.source_id,
      published_at: r.published_at,
      source_name: src?.name ?? "Unknown",
    };
  });
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
